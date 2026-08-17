import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BODY_BY_NAME, SCALE } from '../data/celestialBodies'
import { createFadingOrbitTrailGeometry, updateFadingOrbitTrail } from '../utils/orbitTrail'

const KM_TO_WORLD = SCALE
const EARTH_RADIUS_KM = BODY_BY_NAME.get('Earth').radiusKm
const ORBIT_TILT_AXIS = new THREE.Vector3(0, 0, 1)
const ECLIPTIC_NORMAL = new THREE.Vector3(0, 1, 0)

const HUBBLE_ALTITUDE_KM = 483
const HUBBLE_SPEED_KM_S = 27000 / 3600
const HUBBLE_ORBIT_RADIUS_KM = EARTH_RADIUS_KM + HUBBLE_ALTITUDE_KM
const HUBBLE_ORBIT_RADIUS = HUBBLE_ORBIT_RADIUS_KM * SCALE
const HUBBLE_ANGULAR_SPEED = HUBBLE_SPEED_KM_S / HUBBLE_ORBIT_RADIUS_KM
const HUBBLE_INCLINATION = THREE.MathUtils.degToRad(28.5)

const JWST_L2_DISTANCE = 1_500_000 * SCALE
const JWST_HALO_MAJOR_RADIUS = 750_000 * SCALE
const JWST_HALO_MINOR_RADIUS = 250_000 * SCALE
const JWST_HALO_PERIOD_SECONDS = 168 * 86400
const JWST_HALO_ANGULAR_SPEED = Math.PI * 2 / JWST_HALO_PERIOD_SECONDS
const ORBIT_TRAIL_ARC_RADIANS = Math.PI / 2

function SpacecraftLabel({ children, className, focused, onSelect }) {
  return (
    <Html center wrapperClass="planet-label-wrapper" zIndexRange={[10, 0]}>
      <button
        className={`planet-label spacecraft-label ${className}${focused ? ' is-focused' : ''}`}
        type="button"
        aria-current={focused ? 'true' : undefined}
        onPointerDown={onSelect}
      >
        <span aria-hidden="true">✦</span> {children}
      </button>
    </Html>
  )
}

function HubbleModel() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.00215 * KM_TO_WORLD, 0.00215 * KM_TO_WORLD, 0.0132 * KM_TO_WORLD, 18]} />
        <meshStandardMaterial color="#d9dce1" roughness={0.58} metalness={0.42} />
      </mesh>
      <mesh position={[0, 0, -0.0068 * KM_TO_WORLD]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.00175 * KM_TO_WORLD, 0.00215 * KM_TO_WORLD, 0.0012 * KM_TO_WORLD, 18]} />
        <meshStandardMaterial color="#20252b" roughness={0.72} metalness={0.25} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.0046 * KM_TO_WORLD, 0, 0.001 * KM_TO_WORLD]}>
          <boxGeometry args={[0.0068 * KM_TO_WORLD, 0.00018 * KM_TO_WORLD, 0.0026 * KM_TO_WORLD]} />
          <meshStandardMaterial color="#315f98" emissive="#142d50" emissiveIntensity={0.38} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.0028 * KM_TO_WORLD, 0.004 * KM_TO_WORLD]} rotation={[0, 0, -0.7]}>
        <boxGeometry args={[0.00035 * KM_TO_WORLD, 0.006 * KM_TO_WORLD, 0.00035 * KM_TO_WORLD]} />
        <meshStandardMaterial color="#b8bdc4" roughness={0.62} metalness={0.4} />
      </mesh>
    </group>
  )
}

function JWSTModel() {
  const mirrorSegments = useMemo(() => {
    const positions = []
    const spacing = 0.00175
    const rowCounts = [3, 4, 4, 4, 3]
    for (let row = -2; row <= 2; row += 1) {
      const count = rowCounts[row + 2]
      for (let column = 0; column < count; column += 1) {
        positions.push([
          (column - (count - 1) / 2) * spacing * KM_TO_WORLD,
          row * spacing * 0.86 * KM_TO_WORLD,
          0,
        ])
      }
    }
    return positions
  }, [])

  return (
    <group>
      <mesh scale={[1, 14.2 / 21.2, 1]}>
        <circleGeometry args={[0.0106 * KM_TO_WORLD, 4]} />
        <meshStandardMaterial color="#e6ddcb" side={THREE.DoubleSide} roughness={0.82} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0, -0.00055 * KM_TO_WORLD]} scale={[0.96, 0.96 * 14.2 / 21.2, 1]}>
        <circleGeometry args={[0.0106 * KM_TO_WORLD, 4]} />
        <meshStandardMaterial color="#b9aa95" side={THREE.DoubleSide} roughness={0.88} metalness={0.06} />
      </mesh>
      <group position={[0, 0, 0.0032 * KM_TO_WORLD]} rotation={[Math.PI / 2, 0, 0]}>
        {mirrorSegments.map((position, index) => (
          <mesh key={index} position={position}>
            <circleGeometry args={[0.00074 * KM_TO_WORLD, 6]} />
            <meshStandardMaterial color="#d9a441" emissive="#5b3508" emissiveIntensity={0.24} roughness={0.35} metalness={0.72} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0, 0.0018 * KM_TO_WORLD]}>
        <cylinderGeometry args={[0.001 * KM_TO_WORLD, 0.001 * KM_TO_WORLD, 0.004 * KM_TO_WORLD, 8]} />
        <meshStandardMaterial color="#34383d" roughness={0.66} metalness={0.35} />
      </mesh>
    </group>
  )
}

function Hubble({ bodyRefs, focused, mobilePerformance, onSelect, settings, simulationTimeRef, telescopeRef, visible }) {
  const rootRef = useRef()
  const orbitTrailSegments = mobilePerformance ? 128 : 384
  const orbitGeometry = useMemo(
    () => createFadingOrbitTrailGeometry(orbitTrailSegments, '#18202d', '#b8d5ff'),
    [orbitTrailSegments],
  )
  const offset = useMemo(() => new THREE.Vector3(), [])
  const tangent = useMemo(() => new THREE.Vector3(), [])
  const normal = useMemo(() => new THREE.Vector3(0, 1, 0).applyAxisAngle(ORBIT_TILT_AXIS, HUBBLE_INCLINATION), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])
  const orientation = useMemo(() => new THREE.Matrix4(), [])

  useEffect(() => () => orbitGeometry.dispose(), [orbitGeometry])

  useFrame(() => {
    const earth = bodyRefs.current.Earth
    const telescope = telescopeRef.current
    if (!earth || !telescope || !rootRef.current) return
    rootRef.current.position.copy(earth.position)

    const angle = 4.2 + simulationTimeRef.current * HUBBLE_ANGULAR_SPEED
    updateFadingOrbitTrail(
      orbitGeometry,
      orbitTrailSegments,
      angle,
      ORBIT_TRAIL_ARC_RADIANS,
      HUBBLE_ORBIT_RADIUS,
      HUBBLE_ORBIT_RADIUS,
    )
    offset
      .set(Math.cos(angle) * HUBBLE_ORBIT_RADIUS, 0, Math.sin(angle) * HUBBLE_ORBIT_RADIUS)
      .applyAxisAngle(ORBIT_TILT_AXIS, HUBBLE_INCLINATION)
    telescope.position.copy(offset)
    tangent
      .set(-Math.sin(angle), 0, Math.cos(angle))
      .applyAxisAngle(ORBIT_TILT_AXIS, HUBBLE_INCLINATION)
      .normalize()
    lookTarget.copy(telescope.position).add(tangent)
    orientation.lookAt(telescope.position, lookTarget, normal)
    telescope.quaternion.setFromRotationMatrix(orientation)
  })

  const select = (event) => {
    event.stopPropagation()
    onSelect('Hubble')
  }

  return (
    <group ref={rootRef} visible={visible}>
      <line geometry={orbitGeometry} visible={settings.showOrbits && !focused} rotation={[0, 0, HUBBLE_INCLINATION]}>
        <lineBasicMaterial vertexColors transparent opacity={0.8} depthWrite={false} />
      </line>
      <group ref={telescopeRef} onPointerDown={select}>
        <HubbleModel />
        {settings.showLabels && !focused && <SpacecraftLabel className="hubble-label" focused={focused} onSelect={select}>Hubble</SpacecraftLabel>}
      </group>
    </group>
  )
}

function Webb({ bodyRefs, focused, mobilePerformance, onSelect, settings, simulationTimeRef, telescopeRef, visible }) {
  const rootRef = useRef()
  const orbitTrailSegments = mobilePerformance ? 192 : 512
  const orbitGeometry = useMemo(
    () => createFadingOrbitTrailGeometry(orbitTrailSegments, '#2a2110', '#f1c96b'),
    [orbitTrailSegments],
  )
  const radial = useMemo(() => new THREE.Vector3(), [])
  const tangent = useMemo(() => new THREE.Vector3(), [])
  const l2Position = useMemo(() => new THREE.Vector3(), [])
  const basis = useMemo(() => new THREE.Matrix4(), [])

  useEffect(() => () => orbitGeometry.dispose(), [orbitGeometry])

  useFrame(() => {
    const earth = bodyRefs.current.Earth
    const telescope = telescopeRef.current
    if (!earth || !telescope || !rootRef.current) return

    radial.copy(earth.position).normalize()
    tangent.crossVectors(ECLIPTIC_NORMAL, radial).normalize()
    l2Position.copy(earth.position).addScaledVector(radial, JWST_L2_DISTANCE)
    rootRef.current.position.copy(l2Position)
    basis.makeBasis(tangent, ECLIPTIC_NORMAL, radial)
    rootRef.current.quaternion.setFromRotationMatrix(basis)

    const angle = 2.4 + simulationTimeRef.current * JWST_HALO_ANGULAR_SPEED
    updateFadingOrbitTrail(
      orbitGeometry,
      orbitTrailSegments,
      angle,
      ORBIT_TRAIL_ARC_RADIANS,
      JWST_HALO_MAJOR_RADIUS,
      JWST_HALO_MINOR_RADIUS,
      'xy',
    )
    telescope.position.set(
      Math.cos(angle) * JWST_HALO_MAJOR_RADIUS,
      Math.sin(angle) * JWST_HALO_MINOR_RADIUS,
      0,
    )
  })

  const select = (event) => {
    event.stopPropagation()
    onSelect('JWST')
  }

  return (
    <group ref={rootRef} visible={visible}>
      <line geometry={orbitGeometry} visible={settings.showOrbits && !focused}>
        <lineBasicMaterial vertexColors transparent opacity={0.82} depthWrite={false} />
      </line>
      <group ref={telescopeRef} onPointerDown={select}>
        <JWSTModel />
        {settings.showLabels && !focused && <SpacecraftLabel className="jwst-label" focused={focused} onSelect={select}>JWST</SpacecraftLabel>}
      </group>
    </group>
  )
}

export default function SpaceObservatories(props) {
  return (
    <>
      <Hubble
        {...props}
        focused={props.focusedSpacecraft === 'Hubble'}
        telescopeRef={props.hubbleRef}
      />
      <Webb
        {...props}
        focused={props.focusedSpacecraft === 'JWST'}
        telescopeRef={props.jwstRef}
      />
    </>
  )
}
