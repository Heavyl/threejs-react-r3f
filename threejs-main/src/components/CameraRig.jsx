import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
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
import { createObjectFramingState, updateObjectFraming } from '../utils/objectFraming'

const TARGETING_DURATION = 0.65
const ACCELERATION_DURATION = 2
const DECELERATION_DURATION = 2
const CAMERA_DISTANCE_RADIUS_RATIO = 6
const TOTAL_ACCELERATION_DURATION = TARGETING_DURATION + ACCELERATION_DURATION
const SHIP_CAMERA_DISTANCE = 0.001
const VEHICLE_FOCUS_DURATION = 3.75
const METRICS_UPDATE_INTERVAL = 0.1
const VEHICLE_FOCUS_EXIT_DURATION = 3.45
const VEHICLE_VIEWPORT_FILL = 0.72
const VEHICLE_SWITCH_CLEARANCE_RADIUS_RATIO = 1.7
const MINIMAP_LOOK_DURATION = 0.75
const PREVIEW_UPDATE_INTERVAL = 0.25
const MIN_TRAVEL_FOCAL_LENGTH = 5
const TRAVEL_FOCAL_RATIO = 0
const MAX_SHAKE_PITCH = THREE.MathUtils.degToRad(1.01)
const MAX_SHAKE_YAW = THREE.MathUtils.degToRad(1.01)
const MAX_SHAKE_ROLL = THREE.MathUtils.degToRad(1)
const MAX_SHAKE_STRENGTH = 0.5
const MARTIAN_MOON_TARGETS = new Set(['Phobos', 'Deimos'])

function worldUnitsToKilometers(distance, globalScale) {
  return distance / globalScale / SCALE
}
function applyTravelShake(camera, elapsed, intensity) {
  const strength = Math.min(
    THREE.MathUtils.clamp(intensity, 0, 1) ** 1.5,
    MAX_SHAKE_STRENGTH,
  )
  const pitch = (Math.sin(elapsed * 17.1) + Math.sin(elapsed * 31.7) * 0.35) * MAX_SHAKE_PITCH * strength
  const yaw = (Math.sin(elapsed * 13.7 + 1.4) + Math.sin(elapsed * 27.3) * 0.3) * MAX_SHAKE_YAW * strength
  const roll = (Math.sin(elapsed * 11.3 + 2.1) + Math.sin(elapsed * 23.9) * 0.25) * MAX_SHAKE_ROLL * strength
  camera.rotateX(pitch)
  camera.rotateY(yaw)
  camera.rotateZ(roll)
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
function getCameraDistance(body, globalScale) {
  return body.renderRadius * globalScale * CAMERA_DISTANCE_RADIUS_RATIO
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

function setCubicBezierPoint(result, start, startControl, endControl, end, progress) {
  const inverseProgress = 1 - progress
  const startWeight = inverseProgress ** 3
  const startControlWeight = 3 * inverseProgress ** 2 * progress
  const endControlWeight = 3 * inverseProgress * progress ** 2
  const endWeight = progress ** 3

  return result
    .copy(start)
    .multiplyScalar(startWeight)
    .addScaledVector(startControl, startControlWeight)
    .addScaledVector(endControl, endControlWeight)
    .addScaledVector(end, endWeight)
}

function getCubicBezierLength(start, startControl, endControl, end) {
  const previousPoint = start.clone()
  const sampledPoint = new THREE.Vector3()
  let length = 0

  for (let index = 1; index <= 64; index += 1) {
    setCubicBezierPoint(
      sampledPoint,
      start,
      startControl,
      endControl,
      end,
      index / 64,
    )
    length += previousPoint.distanceTo(sampledPoint)
    previousPoint.copy(sampledPoint)
  }

  return length
}


function advanceTravelMotion(transition, delta, settings) {
  const activeDelta = settings.timeScale > 0 ? delta : 0
  const travelSpeedKmS = getTravelSpeedKmS(settings)
  transition.cinematicElapsed += activeDelta
  transition.targetingElapsed += activeDelta
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
      transition.targetingElapsed / TARGETING_DURATION,
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

  const targetVisualIntensity = Math.min(accelerationIntensity, decelerationIntensity)
  transition.visualIntensity = THREE.MathUtils.damp(
    transition.visualIntensity,
    targetVisualIntensity,
    5,
    activeDelta,
  )

  return {
    progress,
    targetingProgress,
    visualIntensity: transition.visualIntensity,
    arrivalProgress: 1 - decelerationIntensity,
    remainingDurationSeconds,
    travelSpeedKmS,
    hasArrived: transition.remainingDistanceKm <= 0,
  }
}

export default function CameraRig({
  selectedBody,
  focusedBody,
  instantTravelRequest,
  cameraLookRequest,
  bodyRefs,
  controlsRef,
  shipRef,
  spacecraftRefs,
  travelPositionRef,
  shipFocused,
  focusedSpacecraft,
  settings,
  onTravellingChange,
  onTravelPreviewChange,
}) {
  const { camera } = useThree()
  const initialized = useRef(false)
  const previousFocus = useRef(focusedBody)
  const metricsElapsed = useRef(0)
  const previewElapsed = useRef(Infinity)
  const previewBody = useRef(null)
  const shakeElapsed = useRef(0)
  const lastTarget = useMemo(() => new THREE.Vector3(), [])
  const targetPosition = useMemo(() => new THREE.Vector3(), [])
  const shipFocusActive = useRef(false)
  const shipFocusMotion = useRef(null)
  const shipExitMotion = useRef(null)
  const vehicleFocusKey = useRef(null)
  const vehicleSwitchPending = useRef(false)
  const vehicleManualControl = useRef(false)
  const vehicleFraming = useMemo(() => createObjectFramingState(), [])
  const shipPosition = useMemo(() => new THREE.Vector3(), [])
  const focusAlignmentDirection = useMemo(() => new THREE.Vector3(), [])
  const destination = useMemo(() => new THREE.Vector3(), [])
  const previewOrigin = useMemo(() => new THREE.Vector3(), [])
  const targetDisplacement = useMemo(() => new THREE.Vector3(), [])
  const previewTargetPosition = useMemo(() => new THREE.Vector3(), [])
  const previewDestination = useMemo(() => new THREE.Vector3(), [])
  const frameDelta = useMemo(() => new THREE.Vector3(), [])
  const viewOffset = useMemo(() => new THREE.Vector3(1, 0.55, 1).normalize(), [])
  const transition = useRef(null)
  const focusDestination = useMemo(() => new THREE.Vector3(), [])
  const focusEndDirection = useMemo(() => new THREE.Vector3(), [])
  const focusOrbitDirection = useMemo(() => new THREE.Vector3(), [])
  const focusOrbitRotation = useMemo(() => new THREE.Quaternion(), [])
  const focusOrbitStep = useMemo(() => new THREE.Quaternion(), [])
  const handledInstantTravelRequest = useRef(0)
  const handledCameraLookRequest = useRef(0)
  const cameraLookMotion = useRef(null)
  const cameraLookPosition = useMemo(() => new THREE.Vector3(), [])
  const cameraLookDirection = useMemo(() => new THREE.Vector3(), [])
  const cameraLookStart = useMemo(() => new THREE.Vector3(), [])
  const cameraLookDestination = useMemo(() => new THREE.Vector3(), [])
  const travelCameraTarget = useMemo(() => new THREE.Vector3(), [])
  const travelCameraUp = useMemo(() => new THREE.Vector3(), [])
  const travelParentPosition = useMemo(() => new THREE.Vector3(), [])
  const travelRouteEndDirection = useMemo(() => new THREE.Vector3(), [])
  const travelRouteDirection = useMemo(() => new THREE.Vector3(), [])
  const travelRouteRotation = useMemo(() => new THREE.Quaternion(), [])
  const travelRouteStep = useMemo(() => new THREE.Quaternion(), [])
  const travelRoutePreviousPosition = useMemo(() => new THREE.Vector3(), [])
  const travelRouteVelocity = useMemo(() => new THREE.Vector3(), [])
  const travelCurveEndControl = useMemo(() => new THREE.Vector3(), [])
  const travelling = useRef(false)

  const setTravelling = (value) => {
    if (travelling.current === value) return
    travelling.current = value
    onTravellingChange(value)
  }

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return undefined
    const handleInteractionStart = () => {
      if (vehicleFocusKey.current) vehicleManualControl.current = true
    }
    controls.addEventListener('start', handleInteractionStart)
    return () => controls.removeEventListener('start', handleInteractionStart)
  }, [controlsRef])

  useFrame((_, delta) => {
    const targetObject = bodyRefs.current[focusedBody]
    const controls = controlsRef.current
    const body = BODY_BY_NAME.get(focusedBody)
    if (!targetObject || !controls || !body) return

    targetObject.getWorldPosition(targetPosition)
    const cameraDistance = getCameraDistance(body, settings.globalScale)

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

    if (!cameraLookRequest) {
      cameraLookMotion.current = null
    } else if (cameraLookRequest.id !== handledCameraLookRequest.current) {
      handledCameraLookRequest.current = cameraLookRequest.id
      const lookObject = bodyRefs.current[cameraLookRequest.targetId]
      if (lookObject && cameraLookRequest.targetId !== focusedBody) {
        lookObject.getWorldPosition(cameraLookPosition)
        shipFocusActive.current = false
        shipFocusMotion.current = null
        shipExitMotion.current = null
        cameraLookMotion.current = {
          elapsed: 0,
          targetId: cameraLookRequest.targetId,
          startOffset: camera.position.clone().sub(targetPosition),
          startTargetOffset: controls.target.clone().sub(targetPosition),
          distance: Math.max(
            camera.position.distanceTo(targetPosition),
            cameraDistance,
          ),
        }
      } else {
        cameraLookMotion.current = null
      }
    }

    if (cameraLookMotion.current && previousFocus.current !== focusedBody) {
      cameraLookMotion.current = null
    }

    const lookMotion = cameraLookMotion.current
    if (lookMotion && !travelling.current && !transition.current) {
      const lookObject = bodyRefs.current[lookMotion.targetId]
      if (lookObject) {
        lookObject.getWorldPosition(cameraLookPosition)
        cameraLookDirection
          .copy(cameraLookPosition)
          .sub(targetPosition)
          .normalize()
          .multiplyScalar(-1)
        cameraLookDirection.y += 0.22
        cameraLookDirection.normalize()
        cameraLookStart.copy(targetPosition).add(lookMotion.startOffset)
        cameraLookDestination
          .copy(targetPosition)
          .addScaledVector(cameraLookDirection, lookMotion.distance)
        lookMotion.elapsed += delta
        const lookProgress = easeInOutCubic(THREE.MathUtils.clamp(
          lookMotion.elapsed / MINIMAP_LOOK_DURATION,
          0,
          1,
        ))
        camera.position.lerpVectors(
          cameraLookStart,
          cameraLookDestination,
          lookProgress,
        )
        controls.target
          .copy(targetPosition)
          .add(lookMotion.startTargetOffset)
          .lerp(targetPosition, lookProgress)
        controls.enabled = true
        controls.enableDamping = true
        controls.update()
        lastTarget.copy(targetPosition)
        if (lookProgress >= 1) cameraLookMotion.current = null
        return
      }
      cameraLookMotion.current = null
    }

    const currentVehicleFocusKey = focusedSpacecraft ?? (shipFocused ? 'Ship' : null)
    if (currentVehicleFocusKey !== vehicleFocusKey.current) {
      const isSwitchingVehicle = Boolean(
        vehicleFocusKey.current && currentVehicleFocusKey,
      )
      vehicleFocusKey.current = currentVehicleFocusKey
      vehicleSwitchPending.current = isSwitchingVehicle
      vehicleManualControl.current = false
      if (isSwitchingVehicle) {
        shipFocusActive.current = false
        shipFocusMotion.current = null
        shipExitMotion.current = null
      }
    }

    const canFocusShip = (shipFocused || focusedSpacecraft) && !travelling.current && !transition.current
    const ship = shipRef.current
    const focusObject = focusedSpacecraft
      ? spacecraftRefs[focusedSpacecraft]?.current
      : ship

    if (canFocusShip && focusObject) {
      const framing = updateObjectFraming(focusObject, camera, vehicleFraming, {
        viewportFill: VEHICLE_VIEWPORT_FILL,
        fallbackDistance: SHIP_CAMERA_DISTANCE * settings.globalScale,
      })
      shipPosition.copy(framing.center)
      const focusedVehicleDistance = framing.distance

      if (!shipFocusActive.current) {
        const switchingVehicle = vehicleSwitchPending.current
        vehicleSwitchPending.current = false
        viewOffset.copy(camera.position).sub(controls.target)
        if (viewOffset.lengthSq() < 0.000001) viewOffset.set(1, 0.35, 1)
        viewOffset.normalize()
        shipFocusActive.current = true
        shipExitMotion.current = null
        focusOrbitDirection.copy(camera.position).sub(targetPosition)
        shipFocusMotion.current = {
          elapsed: 0,
          startCamera: camera.position.clone(),
          startTarget: controls.target.clone(),
          viewOffset: viewOffset.clone(),
          startDirection: focusOrbitDirection.clone().normalize(),
          startRadius: focusOrbitDirection.length(),
          switchingVehicle,
        }
      }

      if (vehicleManualControl.current) shipFocusMotion.current = null
      const focusMotion = shipFocusMotion.current
      if (focusMotion) {
        focusMotion.elapsed += delta
        const focusProgress = easeInOutCubic(THREE.MathUtils.clamp(
          focusMotion.elapsed / VEHICLE_FOCUS_DURATION,
          0,
          1,
        ))
        focusAlignmentDirection.copy(shipPosition).sub(targetPosition)
        if (focusAlignmentDirection.lengthSq() < 0.0000001) {
          focusAlignmentDirection.copy(focusMotion.viewOffset)
        } else {
          focusAlignmentDirection.normalize()
        }
        focusDestination
          .copy(shipPosition)
          .addScaledVector(focusAlignmentDirection, focusedVehicleDistance)
        focusEndDirection.copy(focusDestination).sub(targetPosition)
        const focusEndRadius = focusEndDirection.length()
        if (focusEndRadius > 0.0000001) {
          focusEndDirection.normalize()
          focusOrbitRotation.setFromUnitVectors(
            focusMotion.startDirection,
            focusEndDirection,
          )
          let orbitProgress
          let focusRadius
          if (focusMotion.switchingVehicle) {
            const departureProgress = easeInOutCubic(THREE.MathUtils.clamp(
              focusProgress / 0.3,
              0,
              1,
            ))
            orbitProgress = easeInOutCubic(THREE.MathUtils.clamp(
              (focusProgress - 0.2) / 0.55,
              0,
              1,
            ))
            const arrivalProgress = easeInOutCubic(THREE.MathUtils.clamp(
              (focusProgress - 0.7) / 0.3,
              0,
              1,
            ))
            const switchClearanceRadius = Math.max(
              focusMotion.startRadius,
              focusEndRadius,
              body.renderRadius
                * settings.globalScale
                * VEHICLE_SWITCH_CLEARANCE_RADIUS_RATIO,
            )
            const departureRadius = THREE.MathUtils.lerp(
              focusMotion.startRadius,
              switchClearanceRadius,
              departureProgress,
            )
            focusRadius = THREE.MathUtils.lerp(
              departureRadius,
              focusEndRadius,
              arrivalProgress,
            )
          } else {
            orbitProgress = easeInOutCubic(THREE.MathUtils.clamp(
              focusProgress / 0.68,
              0,
              1,
            ))
            const approachProgress = easeInOutCubic(THREE.MathUtils.clamp(
              (focusProgress - 0.28) / 0.72,
              0,
              1,
            ))
            const safeRadius = body.renderRadius * settings.globalScale * 1.12
            const interpolatedRadius = THREE.MathUtils.lerp(
              focusMotion.startRadius,
              focusEndRadius,
              approachProgress,
            )
            const clearanceRadius = THREE.MathUtils.lerp(
              Math.min(focusMotion.startRadius, focusEndRadius),
              safeRadius,
              Math.sin(Math.PI * focusProgress),
            )
            focusRadius = Math.max(interpolatedRadius, clearanceRadius)
          }
          focusOrbitStep.identity().slerp(focusOrbitRotation, orbitProgress)
          focusOrbitDirection
            .copy(focusMotion.startDirection)
            .applyQuaternion(focusOrbitStep)
            .normalize()
          camera.position
            .copy(targetPosition)
            .addScaledVector(focusOrbitDirection, focusRadius)
        } else {
          camera.position.lerpVectors(
            focusMotion.startCamera,
            focusDestination,
            focusProgress,
          )
        }
        if (focusMotion.switchingVehicle) {
          const departureLookProgress = easeInOutCubic(THREE.MathUtils.clamp(
            focusProgress / 0.3,
            0,
            1,
          ))
          const arrivalLookProgress = easeInOutCubic(THREE.MathUtils.clamp(
            (focusProgress - 0.62) / 0.38,
            0,
            1,
          ))
          controls.target.lerpVectors(
            focusMotion.startTarget,
            targetPosition,
            departureLookProgress,
          )
          controls.target.lerp(shipPosition, arrivalLookProgress)
        } else {
          controls.target.lerpVectors(
            focusMotion.startTarget,
            shipPosition,
            focusProgress,
          )
        }
        if (focusProgress >= 1) shipFocusMotion.current = null
      } else {
        if (vehicleManualControl.current) {
          frameDelta.copy(shipPosition).sub(lastTarget)
          camera.position.add(frameDelta)
        } else {
          focusAlignmentDirection.copy(shipPosition).sub(targetPosition)
          if (focusAlignmentDirection.lengthSq() < 0.0000001) {
            focusAlignmentDirection.copy(viewOffset)
          } else {
            focusAlignmentDirection.normalize()
          }
          focusDestination
            .copy(shipPosition)
            .addScaledVector(focusAlignmentDirection, focusedVehicleDistance)
          camera.position.copy(focusDestination)
        }
        controls.target.copy(shipPosition)
      }

      controls.enabled = true
      if (vehicleManualControl.current) {
        controls.enableDamping = true
        controls.update()
      } else {
        controls.enableDamping = false
        camera.lookAt(controls.target)
      }
      lastTarget.copy(shipPosition)
      return
    }

    if (shipFocusActive.current) {
      shipFocusActive.current = false
      shipFocusMotion.current = null
      viewOffset.copy(camera.position).sub(controls.target)
      if (viewOffset.lengthSq() < 0.000001) viewOffset.set(1, 0.55, 1)
      viewOffset.normalize()
      focusOrbitDirection.copy(camera.position).sub(targetPosition)
      shipExitMotion.current = {
        elapsed: 0,
        startCamera: camera.position.clone(),
        startTarget: controls.target.clone(),
        viewOffset: viewOffset.clone(),
        startDirection: focusOrbitDirection.clone().normalize(),
        startRadius: focusOrbitDirection.length(),
      }
    }

    const exitMotion = shipExitMotion.current
    if (exitMotion) {
      exitMotion.elapsed += delta
      const exitProgress = easeInOutCubic(THREE.MathUtils.clamp(
        exitMotion.elapsed / VEHICLE_FOCUS_EXIT_DURATION,
        0,
        1,
      ))
      focusDestination
        .copy(targetPosition)
        .addScaledVector(exitMotion.viewOffset, cameraDistance)
      focusEndDirection.copy(focusDestination).sub(targetPosition).normalize()
      focusOrbitRotation.setFromUnitVectors(
        exitMotion.startDirection,
        focusEndDirection,
      )
      const exitRadiusProgress = easeInOutCubic(THREE.MathUtils.clamp(
        exitProgress / 0.58,
        0,
        1,
      ))
      const exitOrbitProgress = easeInOutCubic(THREE.MathUtils.clamp(
        (exitProgress - 0.18) / 0.82,
        0,
        1,
      ))
      focusOrbitStep.identity().slerp(focusOrbitRotation, exitOrbitProgress)
      focusOrbitDirection
        .copy(exitMotion.startDirection)
        .applyQuaternion(focusOrbitStep)
        .normalize()
      camera.position
        .copy(targetPosition)
        .addScaledVector(
          focusOrbitDirection,
          Math.max(
            THREE.MathUtils.lerp(
              exitMotion.startRadius,
              cameraDistance,
              exitRadiusProgress,
            ),
            THREE.MathUtils.lerp(
              Math.min(exitMotion.startRadius, cameraDistance),
              body.renderRadius * settings.globalScale * 1.12,
              Math.sin(Math.PI * exitProgress),
            ),
          ),
        )
      controls.target.lerpVectors(
        exitMotion.startTarget,
        targetPosition,
        exitProgress,
      )
      controls.enabled = true
      controls.enableDamping = true
      controls.update()
      lastTarget.copy(targetPosition)

      if (exitProgress < 1) return
      shipExitMotion.current = null
    }
    const isInstantTravel = (
      instantTravelRequest?.targetId === focusedBody
      && instantTravelRequest.id !== handledInstantTravelRequest.current
    )

    if (isInstantTravel) {
      const departureId = transition.current?.departureId ?? previousFocus.current
      const previousTransition = transition.current
      handledInstantTravelRequest.current = instantTravelRequest.id
      previousFocus.current = focusedBody
      transition.current = null
      shakeElapsed.current = 0

      viewOffset.copy(camera.position).sub(controls.target)
      if (viewOffset.lengthSq() < 0.000001) viewOffset.set(1, 0.55, 1)
      viewOffset.normalize()

      camera.setFocalLength(
        previousTransition?.baseFocalLength ?? camera.getFocalLength(),
      )
      camera.position.copy(targetPosition).addScaledVector(viewOffset, cameraDistance)
      controls.target.copy(targetPosition)
      controls.enabled = true
      controls.enableDamping = true
      controls.update()
      lastTarget.copy(targetPosition)
      if (!travelPositionRef.current) travelPositionRef.current = new THREE.Vector3()
      travelPositionRef.current.copy(targetPosition)

      publishTravelMetrics({
        hasJourney: false,
        active: false,
        departureId,
        targetId: body.name,
        totalDistanceKm: 0,
        remainingDistanceKm: 0,
        remainingDurationSeconds: 0,
        travelSpeedKmS: 0,
        visualIntensity: 0,
        progress: 1,
      })
      setTravelling(false)
      return
    }

    if (previousFocus.current !== focusedBody) {
      const previousTransition = transition.current
      const isRetargeting = Boolean(previousTransition && travelling.current)
      const departureId = previousTransition?.departureId ?? previousFocus.current
      previousFocus.current = focusedBody
      const ship = shipRef.current
      if (isRetargeting && travelPositionRef.current) {
        shipPosition.copy(travelPositionRef.current)
      } else if (ship) ship.getWorldPosition(shipPosition)
      else shipPosition.copy(controls.target)
      setApproachPosition(
        destination, targetPosition, shipPosition, body, settings.globalScale,
      )
      const travelDistance = shipPosition.distanceTo(destination)
      travelRouteDirection.copy(destination).sub(shipPosition)
      if (
        isRetargeting
        && previousTransition.velocityDirection?.lengthSq() > 0.000000000001
      ) {
        travelRouteDirection.copy(previousTransition.velocityDirection)
      }
      if (travelRouteDirection.lengthSq() < 0.000000000001) {
        travelRouteDirection.set(1, 0, 0)
      }
      travelRouteDirection.normalize()
      travelRouteEndDirection.copy(targetPosition).sub(destination)
      if (travelRouteEndDirection.lengthSq() < 0.000000000001) {
        travelRouteEndDirection.copy(travelRouteDirection)
      } else {
        travelRouteEndDirection.normalize()
      }
      const curveHandleLength = travelDistance * 0.3
      const curveStartControl = shipPosition.clone().addScaledVector(
        travelRouteDirection,
        curveHandleLength,
      )
      const curveEndControl = destination.clone().addScaledVector(
        travelRouteEndDirection,
        -curveHandleLength,
      )
      let parentRoute = null
      if (MARTIAN_MOON_TARGETS.has(body.name) && body.parent) {
        const parentObject = bodyRefs.current[body.parent]
        const parentBody = BODY_BY_NAME.get(body.parent)
        if (parentObject && parentBody) {
          parentObject.getWorldPosition(travelParentPosition)
          travelRouteDirection.copy(shipPosition).sub(travelParentPosition)
          parentRoute = {
            parentId: body.parent,
            startDirection: travelRouteDirection.clone().normalize(),
            startRadius: travelRouteDirection.length(),
            safeRadius: parentBody.renderRadius * settings.globalScale * 1.08,
          }
        }
      }
      const routeDistance = isRetargeting && !parentRoute
        ? getCubicBezierLength(
            shipPosition,
            curveStartControl,
            curveEndControl,
            destination,
          )
        : travelDistance
      const totalDistanceKm = worldUnitsToKilometers(routeDistance, settings.globalScale)
      const initialDurationSeconds = calculateTravelDuration(totalDistanceKm, settings)
      if (!travelPositionRef.current) travelPositionRef.current = new THREE.Vector3()
      travelPositionRef.current.copy(shipPosition)
      transition.current = {
        departureId,
        cinematicElapsed: previousTransition?.cinematicElapsed ?? 0,
        targetingElapsed: 0,
        visualIntensity: previousTransition?.visualIntensity ?? 0,
        remainingDistanceKm: totalDistanceKm,
        lastRemainingRealSeconds: initialDurationSeconds,
        progress: 0,
        startPosition: shipPosition.clone(),
        startControl: curveStartControl,
        arrivalDirection: travelRouteEndDirection.clone(),
        curveHandleLength,
        smoothRoute: isRetargeting,
        velocityDirection: travelRouteDirection.clone(),
        direction: destination.clone().sub(targetPosition).normalize(),
        approachDistance: getApproachDistance(body, settings.globalScale),
        totalDistanceKm,
        baseFocalLength: previousTransition?.baseFocalLength ?? camera.getFocalLength(),
        startCameraPosition: camera.position.clone(),
        startControlsTarget: controls.target.clone(),
        cameraViewOffset: camera.position.clone().sub(controls.target).normalize(),
        startCameraDistance: isRetargeting
          ? camera.position.distanceTo(controls.target)
          : Math.max(camera.position.distanceTo(controls.target), cameraDistance),
        parentRoute,
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
        visualIntensity: transition.current.visualIntensity,
        progress: 0,
      })
      controls.enabled = false
      controls.enableDamping = true
      setTravelling(true)
    }

    if (transition.current) {
      controls.enabled = false
      controls.enableDamping = true
      const motion = advanceTravelMotion(transition.current, delta, settings)
      transition.current.progress = motion.progress
      const visualIntensity = motion.visualIntensity
      travelRoutePreviousPosition.copy(travelPositionRef.current)

      destination.copy(transition.current.direction)
        .multiplyScalar(transition.current.approachDistance)
        .add(targetPosition)
      const parentRoute = transition.current.parentRoute
      const parentObject = parentRoute
        ? bodyRefs.current[parentRoute.parentId]
        : null
      if (parentRoute && parentObject) {
        parentObject.getWorldPosition(travelParentPosition)
        travelRouteEndDirection.copy(destination).sub(travelParentPosition)
        const routeEndRadius = travelRouteEndDirection.length()
        if (routeEndRadius > 0.0000001) {
          travelRouteEndDirection.normalize()
          travelRouteRotation.setFromUnitVectors(
            parentRoute.startDirection,
            travelRouteEndDirection,
          )
          travelRouteStep.identity().slerp(travelRouteRotation, motion.progress)
          travelRouteDirection
            .copy(parentRoute.startDirection)
            .applyQuaternion(travelRouteStep)
            .normalize()
          travelPositionRef.current
            .copy(travelParentPosition)
            .addScaledVector(
              travelRouteDirection,
              Math.max(
                parentRoute.safeRadius,
                THREE.MathUtils.lerp(
                  parentRoute.startRadius,
                  routeEndRadius,
                  motion.progress,
                ),
              ),
            )
        } else {
          travelPositionRef.current.copy(destination)
        }
      } else if (transition.current.smoothRoute) {
        travelCurveEndControl
          .copy(destination)
          .addScaledVector(
            transition.current.arrivalDirection,
            -transition.current.curveHandleLength,
          )
        setCubicBezierPoint(
          travelPositionRef.current,
          transition.current.startPosition,
          transition.current.startControl,
          travelCurveEndControl,
          destination,
          motion.progress,
        )
      } else {
        travelPositionRef.current.lerpVectors(
          transition.current.startPosition,
          destination,
          motion.progress,
        )
      }
      travelRouteVelocity
        .copy(travelPositionRef.current)
        .sub(travelRoutePreviousPosition)
      if (travelRouteVelocity.lengthSq() > 0.000000000001) {
        transition.current.velocityDirection.copy(travelRouteVelocity).normalize()
      }
      const ship = shipRef.current
      if (ship) {
        ship.getWorldPosition(shipPosition)
        travelCameraTarget.lerpVectors(
          shipPosition,
          targetPosition,
          motion.arrivalProgress,
        )
        const travelCameraDistance = THREE.MathUtils.lerp(
          transition.current.startCameraDistance,
          cameraDistance,
          motion.arrivalProgress,
        )
        const framingIntensity = motion.targetingProgress * (1 - motion.arrivalProgress)
        travelCameraUp
          .set(0, 1, 0)
          .applyQuaternion(camera.quaternion)
          .normalize()
        travelCameraTarget.addScaledVector(
          travelCameraUp,
          travelCameraDistance * 0.26 * framingIntensity,
        )
        focusDestination
          .copy(travelCameraTarget)
          .addScaledVector(
            transition.current.cameraViewOffset,
            travelCameraDistance,
          )
        controls.target.lerpVectors(
          transition.current.startControlsTarget,
          travelCameraTarget,
          motion.targetingProgress,
        )
        camera.position.lerpVectors(
          transition.current.startCameraPosition,
          focusDestination,
          motion.targetingProgress,
        )
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
      if (!hasArrived && settings.timeScale > 0) {
        shakeElapsed.current += delta
        applyTravelShake(camera, shakeElapsed.current, visualIntensity)
      }

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
        viewOffset.copy(camera.position).sub(controls.target)
        if (viewOffset.lengthSq() < 0.000001) viewOffset.set(1, 0.55, 1)
        viewOffset.normalize()
        camera.position
          .copy(targetPosition)
          .addScaledVector(viewOffset, cameraDistance)
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



















