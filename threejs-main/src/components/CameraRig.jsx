import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  BODY_BY_NAME,
  SCALE,
} from '../data/celestialBodies'
import { publishTravelMetrics } from '../data/travelMetricsStore'
import { easeInOutCubic } from '../utils/orbit'

const BASE_TRAVEL_SPEED_KM_S = 687000 / 3600
const SOLAR_GRAVITATIONAL_PARAMETER_KM3_S2 = 1.32712440018e11
const CENTRAL_GRAVITATIONAL_PARAMETERS = Object.freeze({
  Earth: 398600.4418,
  Mars: 42828.375214,
})
const TARGETING_DURATION = 0.65
const ACCELERATION_DURATION = 2
const DECELERATION_DURATION = 2
const METRICS_UPDATE_INTERVAL = 0.1
const PREVIEW_UPDATE_INTERVAL = 0.25
const MIN_TRAVEL_FOCAL_LENGTH = 8
const TRAVEL_FOCAL_RATIO = 0.28

function worldUnitsToKilometers(distance, globalScale) {
  return distance / globalScale / SCALE
}

function getSystemBody(body) {
  return body?.parent ? BODY_BY_NAME.get(body.parent) : body
}

function getLocalOrbitRadius(body, systemBody) {
  if (body.name === systemBody.name) return systemBody.radiusKm + 200
  return body.semiMajorAxisKm
}


function getHeliocentricTransferRadius(systemBody) {
  return systemBody.name === 'Sun'
    ? systemBody.radiusKm
    : systemBody.semiMajorAxisKm
}

function calculateHohmannDuration(departureId, targetId) {
  const departureBody = BODY_BY_NAME.get(departureId)
  const targetBody = BODY_BY_NAME.get(targetId)
  if (!departureBody || !targetBody) return null

  const departureSystem = getSystemBody(departureBody)
  const targetSystem = getSystemBody(targetBody)
  if (!departureSystem || !targetSystem) return null

  let departureRadius
  let targetRadius
  let gravitationalParameter

  if (departureSystem.name === targetSystem.name) {
    gravitationalParameter = CENTRAL_GRAVITATIONAL_PARAMETERS[departureSystem.name]
    if (!gravitationalParameter) return null
    departureRadius = getLocalOrbitRadius(departureBody, departureSystem)
    targetRadius = getLocalOrbitRadius(targetBody, targetSystem)
  } else {
    gravitationalParameter = SOLAR_GRAVITATIONAL_PARAMETER_KM3_S2
    departureRadius = getHeliocentricTransferRadius(departureSystem)
    targetRadius = getHeliocentricTransferRadius(targetSystem)
    if (!departureRadius || !targetRadius) return null
  }

  const transferSemiMajorAxis = (departureRadius + targetRadius) * 0.5
  return Math.PI * Math.sqrt(
    transferSemiMajorAxis ** 3 / gravitationalParameter,
  )
}

function calculateBaseTravelDuration(distanceKm, departureId, targetId) {
  const speedLimitedDuration = distanceKm / BASE_TRAVEL_SPEED_KM_S
  const hohmannDuration = calculateHohmannDuration(departureId, targetId)
  return hohmannDuration
    ? Math.max(hohmannDuration, speedLimitedDuration)
    : speedLimitedDuration
}

function advanceTravelMotion(transition, delta, settings) {
  const activeDelta = settings.timeScale > 0 ? delta : 0
  const normalizedCruiseRate = (
    settings.timeScale
    * settings.travelSpeedMultiplier
    / transition.physicalDuration
  )
  let speedFactor = 0

  transition.phaseElapsed += activeDelta

  if (transition.phase === 'targeting') {
    const accelerationProgress = THREE.MathUtils.clamp(
      transition.phaseElapsed / (TARGETING_DURATION + ACCELERATION_DURATION),
      0,
      1,
    )
    speedFactor = accelerationProgress
    transition.motionProgress = Math.min(
      0.999999,
      transition.motionProgress + normalizedCruiseRate * speedFactor * activeDelta,
    )
    if (transition.phaseElapsed >= TARGETING_DURATION) {
      transition.phase = 'accelerating'
      transition.phaseElapsed -= TARGETING_DURATION
    }
  }

  if (transition.phase === 'accelerating') {
    speedFactor = THREE.MathUtils.clamp(
      (TARGETING_DURATION + transition.phaseElapsed)
        / (TARGETING_DURATION + ACCELERATION_DURATION),
      0,
      1,
    )
    transition.motionProgress = Math.min(
      0.999999,
      transition.motionProgress + normalizedCruiseRate * speedFactor * activeDelta,
    )
    if (transition.phaseElapsed >= ACCELERATION_DURATION) {
      transition.phase = 'cruising'
      transition.phaseElapsed -= ACCELERATION_DURATION
      speedFactor = 1
    }
  }

  if (transition.phase === 'cruising') {
    speedFactor = 1
    const decelerationDistance = normalizedCruiseRate * DECELERATION_DURATION * 0.5
    transition.motionProgress = Math.min(
      0.999999,
      transition.motionProgress + normalizedCruiseRate * activeDelta,
    )
    if (1 - transition.motionProgress <= decelerationDistance) {
      transition.phase = 'decelerating'
      transition.phaseElapsed = 0
      transition.decelerationStartProgress = transition.motionProgress
    }
  }

  if (transition.phase === 'decelerating') {
    const decelerationProgress = THREE.MathUtils.clamp(
      transition.phaseElapsed / DECELERATION_DURATION,
      0,
      1,
    )
    speedFactor = 1 - decelerationProgress
    const easedProgress = 1 - (1 - decelerationProgress) ** 2
    transition.motionProgress = THREE.MathUtils.lerp(
      transition.decelerationStartProgress,
      1,
      easedProgress,
    )
  }

  const targetingProgress = transition.phase === 'targeting'
    ? 1 - (
        1 - THREE.MathUtils.clamp(transition.phaseElapsed / TARGETING_DURATION, 0, 1)
      ) ** 3
    : 1
  const visualIntensity = transition.phase === 'targeting'
    ? easeInOutCubic(speedFactor)
    : transition.phase === 'accelerating'
    ? easeInOutCubic(speedFactor)
    : transition.phase === 'decelerating'
      ? easeInOutCubic(speedFactor)
      : transition.phase === 'cruising' ? 1 : 0

  return {
    progress: transition.motionProgress,
    targetingProgress,
    visualIntensity,
    physicalNormalizedVelocity: settings.travelSpeedMultiplier
      * speedFactor
      / transition.physicalDuration,
    hasArrived: transition.phase === 'decelerating'
      && transition.phaseElapsed >= DECELERATION_DURATION,
  }
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
  const departurePosition = useMemo(() => new THREE.Vector3(), [])
  const destination = useMemo(() => new THREE.Vector3(), [])
  const movingStartPosition = useMemo(() => new THREE.Vector3(), [])
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
          const physicalDuration = calculateBaseTravelDuration(distanceKm, focusedBody, selectedBody)
          const durationSeconds = physicalDuration / settings.travelSpeedMultiplier

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
      const departureObject = bodyRefs.current[departureId]
      if (departureObject) departureObject.getWorldPosition(departurePosition)
      else departurePosition.copy(controls.target)
      previousFocus.current = focusedBody
      viewOffset.copy(camera.position).sub(controls.target)
      if (viewOffset.lengthSq() < 0.0001) viewOffset.set(1, 0.55, 1)
      viewOffset.normalize()

      destination.copy(viewOffset).multiplyScalar(cameraDistance).add(targetPosition)
      const travelDistance = camera.position.distanceTo(destination)
      const totalDistanceKm = worldUnitsToKilometers(travelDistance, settings.globalScale)
      const physicalDuration = calculateBaseTravelDuration(totalDistanceKm, departureId, body.name)
      transition.current = {
        departureId,
        phase: 'targeting',
        phaseElapsed: 0,
        motionProgress: 0,
        decelerationStartProgress: 0,
        progress: 0,
        physicalDuration,
        startPosition: camera.position.clone(),
        startDeparturePosition: departurePosition.clone(),
        startTarget: controls.target.clone(),
        direction: viewOffset.clone(),
        totalDistanceKm,
        baseFocalLength: camera.getFocalLength(),
      }
      metricsElapsed.current = 0
      publishTravelMetrics({
        hasJourney: true,
        active: true,
        departureId,
        targetId: body.name,
        targetingDurationSeconds: TARGETING_DURATION,
        shipDockingDurationSeconds: TARGETING_DURATION + ACCELERATION_DURATION,
        totalDistanceKm,
        remainingDistanceKm: totalDistanceKm,
        remainingDurationSeconds: physicalDuration / settings.travelSpeedMultiplier,
        travelSpeedKmS: 0,
        visualIntensity: 0,
        progress: 0,
      })
      controls.enabled = false
      controls.enableDamping = false
      setTravelling(true)
    }

    if (transition.current) {
      controls.enabled = false
      controls.enableDamping = false
      const motion = advanceTravelMotion(transition.current, delta, settings)
      transition.current.progress = motion.progress
      const visualIntensity = motion.visualIntensity

      destination.copy(transition.current.direction).multiplyScalar(cameraDistance).add(targetPosition)
      const departureObject = bodyRefs.current[transition.current.departureId]
      if (departureObject) departureObject.getWorldPosition(departurePosition)
      else departurePosition.copy(transition.current.startDeparturePosition)
      targetDisplacement
        .copy(departurePosition)
        .sub(transition.current.startDeparturePosition)
      movingStartPosition.copy(transition.current.startPosition).add(targetDisplacement)
      camera.position.lerpVectors(
        movingStartPosition,
        destination,
        motion.progress,
      )
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
      controls.target.lerpVectors(
        transition.current.startTarget,
        targetPosition,
        motion.targetingProgress,
      )

      const hasArrived = motion.hasArrived
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
            : Math.max(
                0,
                (1 - motion.progress)
                  * transition.current.physicalDuration
                  / settings.travelSpeedMultiplier,
              ),
          travelSpeedKmS: transition.current.totalDistanceKm
            * motion.physicalNormalizedVelocity,
          visualIntensity: hasArrived ? 0 : visualIntensity,
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



















