import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  BODY_BY_NAME,
  SCALE,
} from '../data/celestialBodies'
import { publishTravelMetrics } from '../data/travelMetricsStore'
import { easeInOutCubic } from '../utils/orbit'

const SPEED_OF_LIGHT_KM_S = 299792.458
const MIN_BASE_TRAVEL_DURATION = 3
const METRICS_UPDATE_INTERVAL = 0.1
const PREVIEW_UPDATE_INTERVAL = 0.25
const MIN_TRAVEL_FOCAL_LENGTH = 8
const TRAVEL_FOCAL_RATIO = 0.28
const TARGET_FOCUS_LEAD = 1.8

function worldUnitsToKilometers(distance, globalScale) {
  return distance / globalScale / SCALE
}

export default function CameraRig({ selectedBody, focusedBody, bodyRefs, controlsRef, settings, onTravellingChange, onTravelPreviewChange }) {
  const { camera } = useThree()
  const initialized = useRef(false)
  const previousFocus = useRef(focusedBody)
  const metricsElapsed = useRef(0)
  const previewElapsed = useRef(Infinity)
  const previewBody = useRef(null)
  const lastTarget = useMemo(() => new THREE.Vector3(), [])
  const targetPosition = useMemo(() => new THREE.Vector3(), [])
  const destination = useMemo(() => new THREE.Vector3(), [])
  const previewTargetPosition = useMemo(() => new THREE.Vector3(), [])
  const previewDestination = useMemo(() => new THREE.Vector3(), [])
  const previewViewOffset = useMemo(() => new THREE.Vector3(), [])
  const frameDelta = useMemo(() => new THREE.Vector3(), [])
  const viewOffset = useMemo(() => new THREE.Vector3(1, 0.55, 1).normalize(), [])
  const transition = useRef(null)
  const travelling = useRef(false)

  const setTravelling = (value) => {
    if (travelling.current === value) return
    travelling.current = value
    onTravellingChange(value)
  }

  useFrame((_, delta) => {
    const targetObject = bodyRefs.current[focusedBody]
    const controls = controlsRef.current
    const body = BODY_BY_NAME.get(focusedBody)
    if (!targetObject || !controls || !body) return

    targetObject.getWorldPosition(targetPosition)
    const cameraDistance = Math.max(
      body.renderRadius * settings.globalScale * 6,
      0.02 * settings.globalScale,
    )

    if (!initialized.current) {
      camera.position.copy(targetPosition).addScaledVector(viewOffset, cameraDistance)
      controls.target.copy(targetPosition)
      lastTarget.copy(targetPosition)
      initialized.current = true
      return
    }


    previewElapsed.current += delta
    const hasPreviewTarget = selectedBody !== focusedBody && !transition.current
    if (hasPreviewTarget) {
      const shouldUpdatePreview = previewBody.current !== selectedBody
        || previewElapsed.current >= PREVIEW_UPDATE_INTERVAL

      if (shouldUpdatePreview) {
        const previewObject = bodyRefs.current[selectedBody]
        const previewBodyData = BODY_BY_NAME.get(selectedBody)
        if (previewObject && previewBodyData) {
          previewObject.getWorldPosition(previewTargetPosition)
          previewViewOffset.copy(camera.position).sub(controls.target)
          if (previewViewOffset.lengthSq() < 0.0001) previewViewOffset.set(1, 0.55, 1)
          previewViewOffset.normalize()

          const previewCameraDistance = Math.max(
            previewBodyData.renderRadius * settings.globalScale * 6,
            0.02 * settings.globalScale,
          )
          previewDestination
            .copy(previewViewOffset)
            .multiplyScalar(previewCameraDistance)
            .add(previewTargetPosition)

          const distanceKm = worldUnitsToKilometers(
            camera.position.distanceTo(previewDestination),
            settings.globalScale,
          )
          const physicalDuration = distanceKm / SPEED_OF_LIGHT_KM_S
          const durationSeconds = Math.max(
            MIN_BASE_TRAVEL_DURATION,
            physicalDuration / settings.travelSpeedMultiplier,
          )

          previewBody.current = selectedBody
          previewElapsed.current = 0
          onTravelPreviewChange({ targetId: selectedBody, distanceKm, durationSeconds })
        }
      }
    } else if (previewBody.current !== null) {
      previewBody.current = null
      previewElapsed.current = Infinity
      onTravelPreviewChange(null)
    }
    if (previousFocus.current !== focusedBody) {
      previousFocus.current = focusedBody
      viewOffset.copy(camera.position).sub(controls.target)
      if (viewOffset.lengthSq() < 0.0001) viewOffset.set(1, 0.55, 1)
      viewOffset.normalize()

      destination.copy(viewOffset).multiplyScalar(cameraDistance).add(targetPosition)
      const travelDistance = camera.position.distanceTo(destination)
      const totalDistanceKm = worldUnitsToKilometers(travelDistance, settings.globalScale)
      const physicalDuration = totalDistanceKm / SPEED_OF_LIGHT_KM_S
      const travelDurationSeconds = Math.max(
        MIN_BASE_TRAVEL_DURATION,
        physicalDuration / settings.travelSpeedMultiplier,
      )

      transition.current = {
        progress: 0,
        physicalDuration,
        startPosition: camera.position.clone(),
        startTarget: controls.target.clone(),
        direction: viewOffset.clone(),
        totalDistanceKm,
        baseFocalLength: camera.getFocalLength(),
      }
      metricsElapsed.current = 0
      publishTravelMetrics({
        hasJourney: true,
        active: true,
        targetId: body.name,
        totalDistanceKm,
        remainingDistanceKm: totalDistanceKm,
        remainingDurationSeconds: travelDurationSeconds,
        travelSpeedKmS: totalDistanceKm / travelDurationSeconds,
        progress: 0,
      })
      controls.enabled = false
      controls.enableDamping = false
      setTravelling(true)
    }

    if (transition.current) {
      controls.enabled = false
      controls.enableDamping = false
      const effectiveDuration = Math.max(
        MIN_BASE_TRAVEL_DURATION,
        transition.current.physicalDuration / settings.travelSpeedMultiplier,
      )
      transition.current.progress = Math.min(
        transition.current.progress + delta / effectiveDuration,
        1,
      )

      destination.copy(transition.current.direction).multiplyScalar(cameraDistance).add(targetPosition)
      const easedProgress = easeInOutCubic(transition.current.progress)
      camera.position.lerpVectors(
        transition.current.startPosition,
        destination,
        easedProgress,
      )
      const focalEnvelope = Math.sin(Math.PI * transition.current.progress) ** 1.5
      const travelFocalLength = Math.max(
        MIN_TRAVEL_FOCAL_LENGTH,
        transition.current.baseFocalLength * TRAVEL_FOCAL_RATIO,
      )
      camera.setFocalLength(
        THREE.MathUtils.lerp(
          transition.current.baseFocalLength,
          travelFocalLength,
          focalEnvelope,
        ),
      )
      const targetProgress = easeInOutCubic(
        Math.min(transition.current.progress * TARGET_FOCUS_LEAD, 1),
      )
      controls.target.lerpVectors(
        transition.current.startTarget,
        targetPosition,
        targetProgress,
      )

      const hasArrived = transition.current.progress >= 1
      if (hasArrived) camera.position.copy(destination)
      controls.update()

      metricsElapsed.current += delta
      if (metricsElapsed.current >= METRICS_UPDATE_INTERVAL || hasArrived) {
        metricsElapsed.current = 0
        publishTravelMetrics({
          hasJourney: !hasArrived,
          active: !hasArrived,
          remainingDurationSeconds: hasArrived
            ? 0
            : Math.max(0, (1 - transition.current.progress) * effectiveDuration),
          travelSpeedKmS: transition.current.totalDistanceKm / effectiveDuration,
          remainingDistanceKm: hasArrived
            ? 0
            : worldUnitsToKilometers(camera.position.distanceTo(destination), settings.globalScale),
          progress: transition.current.progress,
        })
      }

      if (hasArrived) {
        camera.setFocalLength(transition.current.baseFocalLength)
        controls.target.copy(targetPosition)
        controls.update()
        lastTarget.copy(targetPosition)
        transition.current = null
        controls.enableDamping = true
        controls.enabled = true
        setTravelling(false)
      }
    } else {
      frameDelta.copy(targetPosition).sub(lastTarget)
      camera.position.add(frameDelta)
      controls.target.copy(targetPosition)
    }

    lastTarget.copy(targetPosition)
  })

  return null
}












