import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BODY_BY_NAME, SCALE } from '../data/celestialBodies'
import { createFadingOrbitTrailGeometry, updateFadingOrbitTrail } from '../utils/orbitTrail'
import SpacecraftAnalysisHotspots from './SpacecraftAnalysisHotspots'

const ISS_ALTITUDE_KM = 400
const ISS_SPEED_KM_S = 7.66
const ISS_INCLINATION_RADIANS = THREE.MathUtils.degToRad(51.6)
const ISS_ORBIT_RADIUS_KM = BODY_BY_NAME.get('Earth').radiusKm + ISS_ALTITUDE_KM
const ISS_ORBIT_RADIUS = ISS_ORBIT_RADIUS_KM * SCALE
const ISS_ANGULAR_SPEED = ISS_SPEED_KM_S / ISS_ORBIT_RADIUS_KM
const ISS_PHASE = 1.15
const KM_TO_WORLD = SCALE
const ISS_TILT_AXIS = new THREE.Vector3(0, 0, 1)
const ORBIT_TRAIL_ARC_RADIANS = Math.PI / 2

function SolarArray({ position }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.022 * KM_TO_WORLD, 0.0007 * KM_TO_WORLD, 0.029 * KM_TO_WORLD]} />
        <meshStandardMaterial color="#285a94" emissive="#102d55" emissiveIntensity={0.45} roughness={0.72} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.0005 * KM_TO_WORLD, 0]}>
        <boxGeometry args={[0.0222 * KM_TO_WORLD, 0.00015 * KM_TO_WORLD, 0.0292 * KM_TO_WORLD]} />
        <meshBasicMaterial color="#3f79b4" wireframe transparent opacity={0.32} />
      </mesh>
    </group>
  )
}

function ISSModel() {
  const arrayPositions = [-0.041, -0.014, 0.014, 0.041]

  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.0011 * KM_TO_WORLD, 0.0011 * KM_TO_WORLD, 0.094 * KM_TO_WORLD, 10]} />
        <meshStandardMaterial color="#c7cbd0" roughness={0.68} metalness={0.32} />
      </mesh>

      {arrayPositions.flatMap((x) => [
        <SolarArray key={`${x}-front`} position={[x * KM_TO_WORLD, 0, 0.0218 * KM_TO_WORLD]} />,
        <SolarArray key={`${x}-back`} position={[x * KM_TO_WORLD, 0, -0.0218 * KM_TO_WORLD]} />,
      ])}

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0042 * KM_TO_WORLD, 0.0042 * KM_TO_WORLD, 0.067 * KM_TO_WORLD, 14]} />
        <meshStandardMaterial color="#e5e0d5" roughness={0.78} metalness={0.18} />
      </mesh>
      {[-0.022, -0.008, 0.008, 0.022].map((z) => (
        <mesh key={z} position={[0, 0, z * KM_TO_WORLD]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0052 * KM_TO_WORLD, 0.0052 * KM_TO_WORLD, 0.008 * KM_TO_WORLD, 14]} />
          <meshStandardMaterial color="#f0ece2" roughness={0.82} metalness={0.12} />
        </mesh>
      ))}
      <mesh position={[0.052 * KM_TO_WORLD, 0, 0]}>
        <boxGeometry args={[0.005 * KM_TO_WORLD, 0.003 * KM_TO_WORLD, 0.003 * KM_TO_WORLD]} />
        <meshStandardMaterial color="#d7a74f" roughness={0.64} metalness={0.2} />
      </mesh>
    </group>
  )
}

export default function InternationalSpaceStation({
  analysisClosing,
  analysisConfig,
  analysisSectionId,
  bodyRefs,
  focused,
  mobilePerformance,
  onSelect,
  settings,
  simulationTimeRef,
  stationRef,
  visible,
  language,
  onAnalysisSectionSelect,
}) {
  const rootRef = useRef()
  const orbitTrailSegments = mobilePerformance ? 128 : 384
  const orbitGeometry = useMemo(
    () => createFadingOrbitTrailGeometry(orbitTrailSegments, '#10263b', '#8edbff'),
    [orbitTrailSegments],
  )
  const orbitOffset = useMemo(() => new THREE.Vector3(), [])
  const tangent = useMemo(() => new THREE.Vector3(), [])
  const normal = useMemo(
    () => new THREE.Vector3(0, 1, 0).applyAxisAngle(ISS_TILT_AXIS, ISS_INCLINATION_RADIANS),
    [],
  )
  const lookTarget = useMemo(() => new THREE.Vector3(), [])
  const orientation = useMemo(() => new THREE.Matrix4(), [])

  useEffect(() => () => orbitGeometry.dispose(), [orbitGeometry])

  useFrame(() => {
    const earth = bodyRefs.current.Earth
    const station = stationRef.current
    if (!earth || !station || !rootRef.current) return

    rootRef.current.position.copy(earth.position)
    const angle = ISS_PHASE + simulationTimeRef.current * ISS_ANGULAR_SPEED
    updateFadingOrbitTrail(
      orbitGeometry,
      orbitTrailSegments,
      angle,
      ORBIT_TRAIL_ARC_RADIANS,
      ISS_ORBIT_RADIUS,
      ISS_ORBIT_RADIUS,
    )
    orbitOffset
      .set(Math.cos(angle) * ISS_ORBIT_RADIUS, 0, Math.sin(angle) * ISS_ORBIT_RADIUS)
      .applyAxisAngle(ISS_TILT_AXIS, ISS_INCLINATION_RADIANS)
    station.position.copy(orbitOffset)

    tangent
      .set(-Math.sin(angle), 0, Math.cos(angle))
      .applyAxisAngle(ISS_TILT_AXIS, ISS_INCLINATION_RADIANS)
      .normalize()
    lookTarget.copy(station.position).add(tangent)
    orientation.lookAt(station.position, lookTarget, normal)
    station.quaternion.setFromRotationMatrix(orientation)
  })

  const selectISS = (event) => {
    event.stopPropagation()
    onSelect()
  }

  return (
    <group ref={rootRef} visible={visible}>
      <line
        geometry={orbitGeometry}
        visible={settings.showOrbits && !focused}
        rotation={[0, 0, ISS_INCLINATION_RADIANS]}
      >
        <lineBasicMaterial vertexColors transparent opacity={0.82} depthWrite={false} />
      </line>
      <group ref={stationRef} onPointerDown={selectISS}>
        <ISSModel />
        <SpacecraftAnalysisHotspots
          closing={analysisClosing}
          config={analysisConfig}
          language={language}
          onSelectSection={onAnalysisSectionSelect}
          selectedSectionId={analysisSectionId}
        />
        {settings.showLabels && !focused && (
          <Html center wrapperClass="planet-label-wrapper" zIndexRange={[10, 0]}>
            <button
              className={`planet-label iss-label${focused ? ' is-focused' : ''}`}
              type="button"
              aria-current={focused ? 'true' : undefined}
              onPointerDown={selectISS}
            >
              <span aria-hidden="true">✦</span> ISS
            </button>
          </Html>
        )}
      </group>
    </group>
  )
}
