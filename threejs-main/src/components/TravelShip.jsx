import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { BODY_BY_NAME, SCALE } from '../data/celestialBodies'
import {
  getTravelMetricsSnapshot,
  subscribeToTravelMetrics,
} from '../data/travelMetricsStore'
import { easeInOutCubic } from '../utils/orbit'

const SCREEN_ANCHOR_DISTANCE = 1
const MODEL_PATH = `${import.meta.env.BASE_URL}models/travel-ship.glb`
const MIN_PANEL_CLEARANCE_PX = 230
const MAX_PANEL_CLEARANCE_PX = 285
const SCREEN_HEIGHT_RATIO = 0.055
const ORBIT_SHIP_RADIUS_RATIO = 0.1
const MODEL_PITCH = -0.24
const ORBIT_PHASE = 0.35
const MIN_ORBIT_ALTITUDE_KM = 50
const ORBIT_ALTITUDE_RADIUS_RATIO = 0.65
const FALLBACK_ORBIT_PERIOD_SECONDS = 7200
const ORBIT_TILT_AXIS = new THREE.Vector3(0, 0, 1)

const GRAVITATIONAL_PARAMETERS_KM3_S2 = Object.freeze({
  Sun: 1.32712440018e11,
  Mercury: 22031.86855,
  Venus: 324858.592,
  Earth: 398600.435507,
  Moon: 4902.800118,
  Mars: 42828.375214,
  Phobos: 0.0007112,
  Deimos: 0.0000962,
  Jupiter: 126686531.9,
  Saturn: 37931206.23,
  Uranus: 5793951.3,
  Neptune: 6835099.97,
})

function getParkingOrbit(body) {
  const altitudeKm = Math.max(
    MIN_ORBIT_ALTITUDE_KM,
    body.radiusKm * ORBIT_ALTITUDE_RADIUS_RATIO,
  )
  const radiusKm = body.radiusKm + altitudeKm
  const gravitationalParameter = GRAVITATIONAL_PARAMETERS_KM3_S2[body.name]
  const angularSpeed = gravitationalParameter
    ? Math.sqrt(gravitationalParameter / radiusKm ** 3)
    : Math.PI * 2 / FALLBACK_ORBIT_PERIOD_SECONDS

  return { radiusKm, angularSpeed }
}

export default function TravelShip({ bodyRefs, focusedBody, simulationTimeRef, settings }) {
  const { camera, size } = useThree()
  const { scene } = useGLTF(MODEL_PATH)
  const shipModel = useMemo(() => {
    const model = scene.clone(true)
    model.traverse((object) => {
      if (!object.isMesh) return
      object.material = object.material.clone()
      object.material.depthTest = false
      object.material.depthWrite = false
      object.renderOrder = 8
    })
    return model
  }, [scene])

  const shipRef = useRef()
  const leftTrailRef = useRef()
  const rightTrailRef = useRef()
  const initialized = useRef(false)
  const elapsedTime = useRef(0)
  const trailTime = useRef(0)
  const origin = useMemo(() => new THREE.Vector3(), [])
  const originBodyPosition = useMemo(() => new THREE.Vector3(), [])
  const currentOrigin = useMemo(() => new THREE.Vector3(), [])
  const movingOrigin = useMemo(() => new THREE.Vector3(), [])
  const orbitOffset = useMemo(() => new THREE.Vector3(), [])
  const orbitNormal = useMemo(() => new THREE.Vector3(), [])
  const screenAnchor = useMemo(() => new THREE.Vector3(), [])
  const cameraDirection = useMemo(() => new THREE.Vector3(), [])
  const cameraUp = useMemo(() => new THREE.Vector3(), [])
  const targetPosition = useMemo(() => new THREE.Vector3(), [])
  const travelDirection = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])
  const orientation = useMemo(() => new THREE.Matrix4(), [])
  const metrics = useSyncExternalStore(
    subscribeToTravelMetrics,
    getTravelMetricsSnapshot,
    getTravelMetricsSnapshot,
  )

  useEffect(() => () => {
    shipModel.traverse((object) => {
      if (object.isMesh) object.material.dispose()
    })
  }, [shipModel])

  useEffect(() => {
    shipModel.traverse((object) => {
      if (!object.isMesh) return
      object.material.depthTest = !metrics.active
      object.material.depthWrite = !metrics.active
      object.material.needsUpdate = true
    })
  }, [metrics.active, shipModel])

  useFrame((_, delta) => {
    const ship = shipRef.current
    if (!ship) return

    const isPlaying = settings.timeScale > 0
    if (isPlaying) trailTime.current += delta
    camera.getWorldDirection(cameraDirection)
    cameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize()

    if (!metrics.active) {
      const focusedObject = bodyRefs.current[focusedBody]
      const focusedBodyData = BODY_BY_NAME.get(focusedBody)
      if (!focusedObject || !focusedBodyData) {
        ship.visible = false
        return
      }

      initialized.current = false
      elapsedTime.current = 0
      focusedObject.getWorldPosition(currentOrigin)
      const parkingOrbit = getParkingOrbit(focusedBodyData)
      const orbitAngle = (
        ORBIT_PHASE
        + simulationTimeRef.current * parkingOrbit.angularSpeed
      )
      const orbitRadius = parkingOrbit.radiusKm * SCALE * settings.globalScale
      orbitOffset.set(
        Math.cos(orbitAngle) * orbitRadius,
        0,
        Math.sin(orbitAngle) * orbitRadius,
      )
      const axialTilt = THREE.MathUtils.degToRad(focusedBodyData.axialTilt || 0)
      orbitOffset.applyAxisAngle(ORBIT_TILT_AXIS, axialTilt)
      ship.position.copy(currentOrigin).add(orbitOffset)
      travelDirection
        .set(-Math.sin(orbitAngle), 0, Math.cos(orbitAngle))
        .applyAxisAngle(ORBIT_TILT_AXIS, axialTilt)
        .normalize()
      orbitNormal
        .set(0, 1, 0)
        .applyAxisAngle(ORBIT_TILT_AXIS, axialTilt)
        .normalize()
      lookTarget.copy(ship.position).add(travelDirection)
      orientation.lookAt(ship.position, lookTarget, orbitNormal)
      ship.quaternion.setFromRotationMatrix(orientation)
      ship.visible = true
    } else {
      if (!initialized.current) {
        const departureBody = bodyRefs.current[metrics.departureId]
        origin.copy(ship.position)
        if (departureBody) departureBody.getWorldPosition(originBodyPosition)
        else originBodyPosition.copy(origin)
        initialized.current = true
        elapsedTime.current = 0
      }

      if (isPlaying) elapsedTime.current += delta
      const viewportHeight = (
        2
        * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))
        * SCREEN_ANCHOR_DISTANCE
      )
      const panelClearancePx = THREE.MathUtils.clamp(
        size.height * 0.3,
        MIN_PANEL_CLEARANCE_PX,
        MAX_PANEL_CLEARANCE_PX,
      )
      const verticalRatio = THREE.MathUtils.clamp(
        0.5 - panelClearancePx / size.height,
        0.08,
        0.3,
      )
      screenAnchor
        .copy(camera.position)
        .addScaledVector(cameraDirection, SCREEN_ANCHOR_DISTANCE)
        .addScaledVector(cameraUp, -viewportHeight * verticalRatio)

      const launchProgress = THREE.MathUtils.clamp(
        elapsedTime.current / (
          metrics.shipDockingDurationSeconds ?? metrics.targetingDurationSeconds
        ),
        0,
        1,
      )
      const departureBody = bodyRefs.current[metrics.departureId]
      if (departureBody) departureBody.getWorldPosition(currentOrigin)
      else currentOrigin.copy(originBodyPosition)
      movingOrigin
        .copy(origin)
        .add(currentOrigin)
        .sub(originBodyPosition)
      ship.position.lerpVectors(
        movingOrigin,
        screenAnchor,
        easeInOutCubic(launchProgress),
      )

      const targetBody = bodyRefs.current[metrics.targetId]
      if (targetBody) {
        targetBody.getWorldPosition(targetPosition)
        travelDirection.copy(targetPosition).sub(ship.position)
        if (travelDirection.lengthSq() > 0.000001) {
          travelDirection.normalize()
          lookTarget.copy(ship.position).add(travelDirection)
          orientation.lookAt(ship.position, lookTarget, cameraUp)
          ship.quaternion.setFromRotationMatrix(orientation)
        }
      }
      ship.visible = true
    }

    if (metrics.active) {
      const distanceFromCamera = camera.position.distanceTo(ship.position)
      const shipViewportHeight = (
        2
        * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))
        * distanceFromCamera
      )
      ship.scale.setScalar(Math.max(0.0001, shipViewportHeight * SCREEN_HEIGHT_RATIO))
    } else {
      const focusedBodyData = BODY_BY_NAME.get(focusedBody)
      const orbitScale = focusedBodyData
        ? focusedBodyData.renderRadius * settings.globalScale * ORBIT_SHIP_RADIUS_RATIO
        : 0.0001
      ship.scale.setScalar(Math.max(0.0001, orbitScale))
    }

    const trailLength = metrics.active
      ? THREE.MathUtils.lerp(0.7, 1.8, Math.max(0.15, metrics.visualIntensity))
      : 0.55
    const pulse = 1 + Math.sin(trailTime.current * 13) * 0.08
    if (leftTrailRef.current) leftTrailRef.current.scale.y = trailLength * pulse
    if (rightTrailRef.current) rightTrailRef.current.scale.y = trailLength * (2 - pulse)
  })

  return (
    <group ref={shipRef} visible={false} renderOrder={8}>
      <group rotation={[MODEL_PITCH, 0, 0]}>
        <primitive object={shipModel} />
        <mesh ref={leftTrailRef} position={[-0.53, 0, 2.35]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.2, 1.2, 10]} />
          <meshBasicMaterial color="#8edbff" transparent opacity={0.42} blending={THREE.AdditiveBlending} depthTest={!metrics.active} depthWrite={false} />
        </mesh>
        <mesh ref={rightTrailRef} position={[0.53, 0, 2.35]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.2, 1.2, 10]} />
          <meshBasicMaterial color="#8edbff" transparent opacity={0.42} blending={THREE.AdditiveBlending} depthTest={!metrics.active} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_PATH)
