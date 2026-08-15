import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  BODY_BY_NAME,
  SCALE,
} from '../data/celestialBodies'
import {
  MAX_TRAVEL_SPEED_KM_S,
  MIN_TRAVEL_SPEED_KM_S,
} from '../config/systemSettings'
import { publishTravelMetrics } from '../data/travelMetricsStore'
import { easeInOutCubic } from '../utils/orbit'

const TARGETING_DURATION = 0.65
const ACCELERATION_DURATION = 2
const DECELERATION_DURATION = 2
const TOTAL_ACCELERATION_DURATION = TARGETING_DURATION + ACCELERATION_DURATION
const METRICS_UPDATE_INTERVAL = 0.1
const PREVIEW_UPDATE_INTERVAL = 0.25
const MIN_TRAVEL_FOCAL_LENGTH = 8
const TRAVEL_FOCAL_RATIO = 0.28

function worldUnitsToKilometers(distance, globalScale) {
  return distance / globalScale / SCALE
}


function getTravelSpeedKmS(settings) {
  return THREE.MathUtils.clamp(
    settings.travelSpeedKmS,
    MIN_TRAVEL_SPEED_KM_S,
    MAX_TRAVEL_SPEED_KM_S,
  )
}

function calculateTravelDuration(distanceKm, settings) {
  return distanceKm / getTravelSpeedKmS(settings)
}
function getApproachDistance(body, globalScale) {
  const altitudeKm = Math.max(50, body.radiusKm * 0.65)
  return (body.radiusKm + altitudeKm) * SCALE * globalScale
}

function setApproachPosition(result, bodyPosition, originPosition, body, globalScale) {
  result.copy(originPosition).sub(bodyPosition)
  if (result.lengthSq() < 0.000001) result.set(1, 0.2, 1)
  return result
    .normalize()
    .multiplyScalar(getApproachDistance(body, globalScale))
    .add(bodyPosition)
}


function advanceTravelMotion(transition, delta, settings) {
  const activeDelta = settings.timeScale > 0 ? delta : 0
  const travelSpeedKmS = getTravelSpeedKmS(settings)
  transition.cinematicElapsed += activeDelta
  transition.remainingDistanceKm = Math.max(
    0,
    transition.remainingDistanceKm - activeDelta * travelSpeedKmS,
  )

  const progress = 1 - (
    transition.remainingDistanceKm / transition.totalDistanceKm
  )
  const calculatedRemainingSeconds = calculateTravelDuration(
    transition.remainingDistanceKm,
    settings,
  )
  const remainingDurationSeconds = Number.isFinite(calculatedRemainingSeconds)
    ? calculatedRemainingSeconds
    : transition.lastRemainingRealSeconds ?? Infinity
  transition.lastRemainingRealSeconds = remainingDurationSeconds
  const remainingRealSeconds = remainingDurationSeconds
  const targetingProgress = 1 - (
    1 - THREE.MathUtils.clamp(
      transition.cinematicElapsed / TARGETING_DURATION,
      0,
      1,
    )
  ) ** 3
  const accelerationIntensity = easeInOutCubic(THREE.MathUtils.clamp(
    transition.cinematicElapsed / TOTAL_ACCELERATION_DURATION,
    0,
    1,
  ))
  const decelerationIntensity = easeInOutCubic(THREE.MathUtils.clamp(
    remainingRealSeconds / DECELERATION_DURATION,
    0,
    1,
  ))

  return {
    progress,
    targetingProgress,
    visualIntensity: Math.min(accelerationIntensity, decelerationIntensity),
    remainingDurationSeconds,
    travelSpeedKmS,
    hasArrived: transition.remainingDistanceKm <= 0,
  }
}

export default function CameraRig({ selectedBody, focusedBody, bodyRefs, controlsRef, shipRef, travelPositionRef, settings, onTravellingChange, onTravelPreviewChange }) {
  const { camera } = useThree()
  const initialized = useRef(false)
  const previousFocus = useRef(focusedBody)
  const metricsElapsed = useRef(0)
  const previewElapsed = useRef(Infinity)
  const previewBody = useRef(null)
  const lastTarget = useMemo(() => new THREE.Vector3(), [])
  const targetPosition = useMemo(() => new THREE.Vector3(), [])
  const shipPosition = useMemo(() => new THREE.Vector3(), [])
  const destination = useMemo(() => new THREE.Vector3(), [])
  const previewOrigin = useMemo(() => new THREE.Vector3(), [])
  const targetDisplacement = useMemo(() => new THREE.Vector3(), [])
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
    const hasPreviewTarget = selectedBody !== focusedBody
    if (hasPreviewTarget) {
      const shouldUpdatePreview = previewBody.current !== selectedBody
        || previewElapsed.current >= PREVIEW_UPDATE_INTERVAL

      if (shouldUpdatePreview) {
        const previewObject = bodyRefs.current[selectedBody]
        const previewBodyData = BODY_BY_NAME.get(selectedBody)
        if (previewObject && previewBodyData) {
          previewObject.getWorldPosition(previewTargetPosition)
          const ship = shipRef.current
          if (ship) ship.getWorldPosition(previewOrigin)
          else previewOrigin.copy(camera.position)
          setApproachPosition(
            previewDestination, previewTargetPosition, previewOrigin, previewBodyData, settings.globalScale,
          )

          const distanceKm = worldUnitsToKilometers(
            previewOrigin.distanceTo(previewDestination),
            settings.globalScale,
          )
          const durationSeconds = calculateTravelDuration(distanceKm, settings)

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
      const departureId = previousFocus.current
      const previousTransition = transition.current
      previousFocus.current = focusedBody
      const ship = shipRef.current
      if (ship) ship.getWorldPosition(shipPosition)
      else shipPosition.copy(controls.target)
      setApproachPosition(
        destination, targetPosition, shipPosition, body, settings.globalScale,
      )
      const travelDistance = shipPosition.distanceTo(destination)
      const totalDistanceKm = worldUnitsToKilometers(travelDistance, settings.globalScale)
      const initialDurationSeconds = calculateTravelDuration(totalDistanceKm, settings)
      if (!travelPositionRef.current) travelPositionRef.current = new THREE.Vector3()
      travelPositionRef.current.copy(shipPosition)
      transition.current = {
        departureId,
        cinematicElapsed: 0,
        remainingDistanceKm: totalDistanceKm,
        lastRemainingRealSeconds: initialDurationSeconds,
        progress: 0,
        startPosition: shipPosition.clone(),
        direction: destination.clone().sub(targetPosition).normalize(),
        approachDistance: getApproachDistance(body, settings.globalScale),
        totalDistanceKm,
        baseFocalLength: previousTransition?.baseFocalLength ?? camera.getFocalLength(),
      }
      metricsElapsed.current = 0
      publishTravelMetrics({
        hasJourney: true,
        active: true,
        departureId,
        targetId: body.name,
        targetingDurationSeconds: TARGETING_DURATION,
        shipDockingDurationSeconds: TOTAL_ACCELERATION_DURATION,
        totalDistanceKm,
        remainingDistanceKm: totalDistanceKm,
        remainingDurationSeconds: initialDurationSeconds,
        travelSpeedKmS: getTravelSpeedKmS(settings),
        visualIntensity: 0,
        progress: 0,
      })
      controls.target.copy(shipPosition)
      controls.enabled = true
      controls.enableDamping = true
      setTravelling(true)
    }

    if (transition.current) {
      controls.enabled = true
      controls.enableDamping = true
      const motion = advanceTravelMotion(transition.current, delta, settings)
      transition.current.progress = motion.progress
      const visualIntensity = motion.visualIntensity

      destination.copy(transition.current.direction)
        .multiplyScalar(transition.current.approachDistance)
        .add(targetPosition)
      travelPositionRef.current.lerpVectors(transition.current.startPosition, destination, motion.progress)
      const ship = shipRef.current
      if (ship) {
        ship.getWorldPosition(shipPosition)
        frameDelta.copy(shipPosition).sub(controls.target)
        camera.position.add(frameDelta)
        controls.target.copy(shipPosition)
      }
      const travelFocalLength = Math.max(
        MIN_TRAVEL_FOCAL_LENGTH,
        transition.current.baseFocalLength * TRAVEL_FOCAL_RATIO,
      )
      camera.setFocalLength(
        THREE.MathUtils.lerp(
          transition.current.baseFocalLength,
          travelFocalLength,
          visualIntensity,
        ),
      )
      if (!ship) controls.target.copy(travelPositionRef.current)

      const hasArrived = motion.hasArrived
      if (hasArrived) travelPositionRef.current.copy(destination)
      controls.update()

      metricsElapsed.current += delta
      if (metricsElapsed.current >= METRICS_UPDATE_INTERVAL || hasArrived) {
        metricsElapsed.current = 0
        publishTravelMetrics({
          hasJourney: !hasArrived,
          active: !hasArrived,
          remainingDurationSeconds: hasArrived
            ? 0
            : motion.remainingDurationSeconds,
          travelSpeedKmS: motion.travelSpeedKmS,
          visualIntensity: hasArrived ? 0 : visualIntensity,
          remainingDistanceKm: hasArrived
            ? 0
            : transition.current.remainingDistanceKm,
          progress: transition.current.progress,
        })
      }

      if (hasArrived) {
        camera.setFocalLength(transition.current.baseFocalLength)
        frameDelta.copy(targetPosition).sub(controls.target)
        camera.position.add(frameDelta)
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



















