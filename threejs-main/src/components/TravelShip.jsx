import { Html, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { BODY_BY_NAME, SCALE } from '../data/celestialBodies'
import {
  getTravelMetricsSnapshot,
  subscribeToTravelMetrics,
} from '../data/travelMetricsStore'
import { easeInOutCubic } from '../utils/orbit'
import { getBodyLabel } from '../i18n/translations'
import SpacecraftAnalysisHotspots from './SpacecraftAnalysisHotspots'

const SCREEN_ANCHOR_DISTANCE = 1
const MODEL_PATH = `${import.meta.env.BASE_URL}models/travel-ship.glb`
const MIN_PANEL_CLEARANCE_PX = 230
const MAX_PANEL_CLEARANCE_PX = 285
const SCREEN_HEIGHT_RATIO = 0.055
// Keeps the model's full silhouette comfortably below Phobos's rendered diameter.
const FIXED_ORBIT_SHIP_SCALE = 0.0001
const MODEL_PITCH = -0.24
const ORBIT_PHASE = 0.35
const MIN_ORBIT_ALTITUDE_KM = 50
const ORBIT_ALTITUDE_RADIUS_RATIO = 0.65
const ISS_ORBITAL_SPEED_KM_S = 7.66
const ORBIT_TILT_AXIS = new THREE.Vector3(0, 0, 1)
const SHIP_ORBIT_ARC_RADIANS = Math.PI / 2

function getParkingOrbit(body) {
  const altitudeKm = Math.max(
    MIN_ORBIT_ALTITUDE_KM,
    body.radiusKm * ORBIT_ALTITUDE_RADIUS_RATIO,
  )
  const radiusKm = body.radiusKm + altitudeKm
  const angularSpeed = ISS_ORBITAL_SPEED_KM_S / radiusKm

  return { radiusKm, angularSpeed }
}

export default function TravelShip({ analysisClosing, analysisConfig, analysisSectionId, bodyRefs, focusedBody, language, mobilePerformance, onAnalysisSectionSelect, shipFocused, onSelect, simulationTimeRef, settings, shipRef: sharedShipRef, travelPositionRef }) {
  const { camera } = useThree()
  const { scene } = useGLTF(MODEL_PATH)
  const shipModel = useMemo(() => {
    const model = scene.clone(true)
    model.traverse((object) => {
      if (!object.isMesh) return
      object.material = object.material.clone()
      object.material.depthTest = true
      object.material.depthWrite = true
      object.renderOrder = 8
    })
    return model
  }, [scene])

  const shipRef = sharedShipRef
  const leftTrailRef = useRef()
  const rightTrailRef = useRef()
  const orbitTrailRef = useRef()
  const orbitBodyRef = useRef(focusedBody)
  const initialized = useRef(false)
  const elapsedTime = useRef(0)
  const launchScale = useRef(0.0001)
  const overlayMode = useRef(false)
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
  const previousTravelPosition = useMemo(() => new THREE.Vector3(), [])
  const travelUp = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])
  const orientation = useMemo(() => new THREE.Matrix4(), [])
  const hasPreviousTravelPosition = useRef(false)
  const orbitTrailSegments = mobilePerformance ? 32 : 64
  const orbitTrailGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array((orbitTrailSegments + 1) * 3)
    const colors = new Float32Array((orbitTrailSegments + 1) * 3)
    const tailColor = new THREE.Color('#10263b')
    const shipColor = new THREE.Color('#8edbff')

    for (let index = 0; index <= orbitTrailSegments; index += 1) {
      const progress = index / orbitTrailSegments
      const color = tailColor.clone().lerp(shipColor, progress ** 1.6)
      color.toArray(colors, index * 3)
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [orbitTrailSegments])
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


  useEffect(() => () => orbitTrailGeometry.dispose(), [orbitTrailGeometry])
  const setOverlayMode = (enabled) => {
    if (overlayMode.current === enabled) return
    overlayMode.current = enabled
    shipModel.traverse((object) => {
      if (!object.isMesh) return
      object.material.depthTest = !enabled
      object.material.depthWrite = !enabled
      object.material.needsUpdate = true
    })
    if (leftTrailRef.current) leftTrailRef.current.material.depthTest = !enabled
    if (rightTrailRef.current) rightTrailRef.current.material.depthTest = !enabled
  }

  useFrame((_, delta) => {
    const ship = shipRef.current
    if (!ship) return
    const liveMetrics = getTravelMetricsSnapshot()

    const isPlaying = settings.timeScale > 0
    if (isPlaying) trailTime.current += delta
    camera.getWorldDirection(cameraDirection)
    cameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize()

    if (!liveMetrics.active) {
      hasPreviousTravelPosition.current = false
      // Keep the departure position for one frame so CameraRig can initialize
      // the journey before this ship starts orbiting the newly focused body.
      if (orbitBodyRef.current !== focusedBody) {
        orbitBodyRef.current = focusedBody
        if (orbitTrailRef.current) orbitTrailRef.current.visible = false
        return
      }

      const focusedObject = bodyRefs.current[focusedBody]
      const focusedBodyData = BODY_BY_NAME.get(focusedBody)
      if (!focusedObject || !focusedBodyData) {
        ship.visible = false
        if (orbitTrailRef.current) orbitTrailRef.current.visible = false
        return
      }

      initialized.current = false
      elapsedTime.current = 0
      setOverlayMode(false)
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
      const orbitTrail = orbitTrailRef.current
      if (orbitTrail) {
        const positionAttribute = orbitTrailGeometry.getAttribute('position')
        const positions = positionAttribute.array
        const cosTilt = Math.cos(axialTilt)
        const sinTilt = Math.sin(axialTilt)

        for (let index = 0; index <= orbitTrailSegments; index += 1) {
          const progress = index / orbitTrailSegments
          const pointAngle = orbitAngle - SHIP_ORBIT_ARC_RADIANS * (1 - progress)
          const radialX = Math.cos(pointAngle) * orbitRadius
          const offset = index * 3
          positions[offset] = radialX * cosTilt
          positions[offset + 1] = radialX * sinTilt
          positions[offset + 2] = Math.sin(pointAngle) * orbitRadius
        }

        positionAttribute.needsUpdate = true
        orbitTrail.position.copy(currentOrigin)
        orbitTrail.visible = settings.showOrbits
      }
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
      if (orbitTrailRef.current) orbitTrailRef.current.visible = false
      let startedThisFrame = false
      if (!initialized.current) {
        launchScale.current = Math.max(0.0001, ship.scale.x)
        initialized.current = true
        elapsedTime.current = 0
        startedThisFrame = true
      }

      if (isPlaying && !startedThisFrame) elapsedTime.current += delta
      if (!hasPreviousTravelPosition.current) {
        previousTravelPosition.copy(ship.position)
        hasPreviousTravelPosition.current = true
      }
      if (travelPositionRef.current) ship.position.copy(travelPositionRef.current)
      setOverlayMode(false)

      // Follow the actual route tangent. Pointing directly at the destination
      // becomes visibly wrong on curved approaches that avoid a planet.
      travelDirection.copy(ship.position).sub(previousTravelPosition)
      if (travelDirection.lengthSq() < 1e-20) {
        const targetBody = bodyRefs.current[liveMetrics.targetId]
        if (targetBody) {
          targetBody.getWorldPosition(targetPosition)
          travelDirection.copy(targetPosition).sub(ship.position)
        }
      }
      if (travelDirection.lengthSq() >= 1e-20) {
        travelDirection.normalize()
        travelUp.copy(cameraUp)
        if (Math.abs(travelUp.dot(travelDirection)) > 0.98) {
          travelUp.set(0, 1, 0)
          if (Math.abs(travelUp.dot(travelDirection)) > 0.98) {
            travelUp.set(1, 0, 0)
          }
        }
        lookTarget.copy(ship.position).add(travelDirection)
        orientation.lookAt(ship.position, lookTarget, travelUp)
        ship.quaternion.setFromRotationMatrix(orientation)
      }
      previousTravelPosition.copy(ship.position)
      ship.visible = true
    }

    if (liveMetrics.active) {
      const distanceFromCamera = camera.position.distanceTo(ship.position)
      const shipViewportHeight = (
        2
        * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))
        * distanceFromCamera
      )
      const screenScale = Math.max(0.0001, shipViewportHeight * SCREEN_HEIGHT_RATIO)
      const launchProgress = THREE.MathUtils.clamp(
        elapsedTime.current / (
          liveMetrics.shipDockingDurationSeconds ?? liveMetrics.targetingDurationSeconds
        ),
        0,
        1,
      )
      ship.scale.setScalar(THREE.MathUtils.lerp(
        launchScale.current,
        screenScale,
        easeInOutCubic(launchProgress),
      ))
    } else {
      const orbitScale = FIXED_ORBIT_SHIP_SCALE * settings.globalScale
      ship.scale.setScalar(Math.max(0.0001, orbitScale))
    }

    const trailLength = liveMetrics.active
      ? THREE.MathUtils.lerp(0.7, 1.8, Math.max(0.15, liveMetrics.visualIntensity))
      : 0.55
    const pulse = 1 + Math.sin(trailTime.current * 13) * 0.08
    if (leftTrailRef.current) leftTrailRef.current.scale.y = trailLength * pulse
    if (rightTrailRef.current) rightTrailRef.current.scale.y = trailLength * (2 - pulse)
  })

  const selectShip = (event) => {
    event.stopPropagation()
    if (!metrics.active) onSelect()
  }

  return (
    <>
    <group ref={shipRef} visible={false} renderOrder={8} onPointerDown={selectShip}>
      <group rotation={[MODEL_PITCH, 0, 0]}>
        <primitive object={shipModel} />
        <mesh ref={leftTrailRef} position={[-0.53, 0, 2.35]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.2, 1.2, 10]} />
          <meshBasicMaterial color="#8edbff" transparent opacity={0.42} blending={THREE.AdditiveBlending} depthTest depthWrite={false} />
        </mesh>
        <mesh ref={rightTrailRef} position={[0.53, 0, 2.35]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.2, 1.2, 10]} />
          <meshBasicMaterial color="#8edbff" transparent opacity={0.42} blending={THREE.AdditiveBlending} depthTest depthWrite={false} />
        </mesh>
        <SpacecraftAnalysisHotspots
          closing={analysisClosing}
          config={analysisConfig?.id === 'Ship' ? analysisConfig : null}
          language={language}
          onSelectSection={onAnalysisSectionSelect}
          selectedSectionId={analysisSectionId}
        />
      </group>
      {settings.showLabels && !metrics.active && !shipFocused && (
        <Html
          center
          position={[0, 0, 0]}
          wrapperClass="planet-label-wrapper"
          zIndexRange={[10, 0]}
        >
          <button
            className={[
              'planet-label',
              'ship-label',
              shipFocused && 'is-focused',
            ].filter(Boolean).join(' ')}
            type="button"
            aria-current={shipFocused ? 'true' : undefined}
            onPointerDown={selectShip}
          >
            <span aria-hidden="true">◇</span>{' '}
            {getBodyLabel('Ship', language)}
          </button>
        </Html>
      )}
    </group>
      <line
        ref={orbitTrailRef}
        geometry={orbitTrailGeometry}
        visible={settings.showOrbits && !metrics.active}
        frustumCulled={false}
        renderOrder={2}
      >
        <lineBasicMaterial vertexColors transparent opacity={0.78} depthTest depthWrite={false} />
      </line>
    </>
  )
}

useGLTF.preload(MODEL_PATH)
