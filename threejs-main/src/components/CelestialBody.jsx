import { Html, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getTravelMetricsSnapshot } from '../data/travelMetricsStore'
import { getBodyLabel } from '../i18n/translations'
import { createOrbitGeometry, setOrbitalPosition } from '../utils/orbit'
import SolarAtmosphere from './SolarAtmosphere'

const MARTIAN_MOON_MODELS = Object.freeze({
  Phobos: `${import.meta.env.BASE_URL}models/phobos.glb`,
  Deimos: `${import.meta.env.BASE_URL}models/deimos.glb`,
})

function IrregularMoon({ body, texture, onPointerDown }) {
  const { scene } = useGLTF(MARTIAN_MOON_MODELS[body.name])
  const geometry = useMemo(() => {
    let moonGeometry
    scene.traverse((object) => {
      if (!moonGeometry && object.isMesh) moonGeometry = object.geometry
    })
    return moonGeometry
  }, [scene])

  return (
    <mesh
      geometry={geometry}
      scale={body.renderRadius}
      onPointerDown={onPointerDown}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial map={texture} color="#ffffff" roughness={0.96} metalness={0} />
    </mesh>
  )
}

function Atmosphere({ type, textures, radius, segments }) {
  if (type === 'earth') {
    return (
      <>
        <mesh scale={1.035}>
          <sphereGeometry args={[radius, segments, segments]} />
          <meshBasicMaterial color="#3d7dff" transparent opacity={0.18} side={THREE.BackSide} depthWrite={false} />
        </mesh>
        <mesh scale={1.014}>
          <sphereGeometry args={[radius, segments, segments]} />
          <meshStandardMaterial alphaMap={textures.earthClouds} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      </>
    )
  }

  if (type === 'venus') {
    return (
      <mesh scale={1.03}>
        <sphereGeometry args={[radius, segments, segments]} />
        <meshStandardMaterial map={textures.venusClouds} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    )
  }

  return (
    <mesh scale={1.025}>
      <sphereGeometry args={[radius, segments, segments]} />
      <meshBasicMaterial color="#dd6c30" transparent opacity={0.17} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  )
}

function SaturnRings({ texture, radius, segments }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 1.15, radius * 2.41, segments]} />
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} transparent opacity={0.9} roughness={0.65} />
    </mesh>
  )
}

export function OrbitPath({ body, bodyRefs, settings, mobilePerformance }) {
  const orbitRef = useRef()
  const materialRef = useRef()
  const orbitSegments = mobilePerformance ? 512 : 2048
  const geometry = useMemo(() => createOrbitGeometry(body, orbitSegments), [body, orbitSegments])

  useFrame((_, delta) => {
    const parent = body.parent ? bodyRefs.current[body.parent] : null
    if (parent) orbitRef.current.position.copy(parent.position)

    const { visualIntensity } = getTravelMetricsSnapshot()
    const targetOpacity = settings.orbitOpacity * (1 - visualIntensity)
    materialRef.current.opacity = THREE.MathUtils.damp(
      materialRef.current.opacity,
      targetOpacity,
      10,
      delta,
    )
  })

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <line
      ref={orbitRef}
      geometry={geometry}
      visible={settings.showOrbits}
      rotation={[0, 0, THREE.MathUtils.degToRad(body.planeTilt || 0)]}
    >
      <lineBasicMaterial ref={materialRef} color={body.orbitColor} transparent opacity={settings.orbitOpacity} />
    </line>
  )
}

export function CelestialBody({
  body,
  textures,
  bodyRefs,
  simulationTimeRef,
  settings,
  mobilePerformance,
  isSelected,
  isFocused,
  isParentFocused,
  interactionDisabled,
  language,
  onSelect,
  onLabelSelect,
}) {
  const bodyRef = useRef()
  const spinRef = useRef()
  const orbitalPosition = useMemo(() => new THREE.Vector3(), [])

  useLayoutEffect(() => {
    bodyRefs.current[body.name] = bodyRef.current
    return () => {
      if (bodyRefs.current[body.name] === bodyRef.current) delete bodyRefs.current[body.name]
    }
  }, [body.name, bodyRefs])

  useFrame(() => {
    const parent = body.parent ? bodyRefs.current[body.parent] : null
    setOrbitalPosition(orbitalPosition, body, simulationTimeRef.current, parent?.position)
    bodyRef.current.position.copy(orbitalPosition)

    if (body.rotationAngularSpeed) {
      spinRef.current.rotation.y = simulationTimeRef.current * body.rotationAngularSpeed
    }
  })

  const selectBody = (event) => {
    event.stopPropagation()
    if (!interactionDisabled) onSelect(body.name)
  }

  const selectBodyFromLabel = (event) => {
    event.stopPropagation()
    if (!interactionDisabled) onLabelSelect(body.name)
  }

  const surfaceSegments = mobilePerformance ? (body.emissive ? 64 : 48) : (body.emissive ? 64 : 48)
  const atmosphereSegments = mobilePerformance ? 24 : 40
  const ringSegments = mobilePerformance ? 96 : 160
  const labelHeight = body.renderRadius + Math.max(0.15, body.renderRadius * 0.13)

  return (
    <group ref={bodyRef}>
      <group
        rotation={[0, 0, THREE.MathUtils.degToRad(body.axialTilt || 0)]}
      >
        <group ref={spinRef}>
          {MARTIAN_MOON_MODELS[body.name] ? (
            <IrregularMoon body={body} texture={textures[body.texture]} onPointerDown={selectBody} />
          ) : (
            <mesh onPointerDown={selectBody}>
              <sphereGeometry args={[body.renderRadius, surfaceSegments, surfaceSegments]} />
              {body.emissive ? (
                <meshBasicMaterial map={textures[body.texture]} />
              ) : (
                <meshStandardMaterial
                  map={textures[body.texture]}
                  normalMap={body.name === 'Earth' ? textures.earthNormal : undefined}
                  color={body.texture ? '#ffffff' : '#b8b8b8'}
                  roughness={0.82}
                  metalness={0}
                />
              )}
            </mesh>
          )}
          {settings.showAtmospheres && body.atmosphere && (
            <Atmosphere type={body.atmosphere} textures={textures} radius={body.renderRadius} segments={atmosphereSegments} />
          )}
          {settings.showRings && body.rings && (
            <SaturnRings texture={textures.saturnRings} radius={body.renderRadius} segments={ringSegments} />
          )}
        </group>
      </group>

      {body.emissive && settings.showAtmospheres && (
        <SolarAtmosphere
          radius={body.renderRadius}
          texture={textures[body.texture]}
          mobilePerformance={mobilePerformance}
          timeScale={settings.timeScale}
        />
      )}

      {settings.showLabels && isParentFocused && (
        <Html
          center
          position={[0, labelHeight, 0]}
          wrapperClass="planet-label-wrapper"
          zIndexRange={[10, 0]}
        >
          <button
            className={[
              'planet-label',
              isSelected && 'is-selected',
              isFocused && 'is-focused',
            ].filter(Boolean).join(' ')}
            type="button"
            aria-pressed={isSelected}
            aria-current={isFocused ? 'true' : undefined}
            disabled={interactionDisabled}
            onPointerDown={selectBodyFromLabel}
          >
            <span aria-hidden="true">𐤏</span> {getBodyLabel(body.name, language)}
          </button>
        </Html>
      )}
    </group>
  )
}

useGLTF.preload(MARTIAN_MOON_MODELS.Phobos)
useGLTF.preload(MARTIAN_MOON_MODELS.Deimos)


