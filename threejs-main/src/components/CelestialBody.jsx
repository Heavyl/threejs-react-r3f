import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getBodyLabel } from '../i18n/translations'
import { createOrbitGeometry, setOrbitalPosition } from '../utils/orbit'


function Atmosphere({ type, textures, radius }) {
  if (type === 'earth') {
    return (
      <>
        <mesh scale={1.035}>
          <sphereGeometry args={[radius, 40, 40]} />
          <meshBasicMaterial color="#3d7dff" transparent opacity={0.18} side={THREE.BackSide} depthWrite={false} />
        </mesh>
        <mesh scale={1.014}>
          <sphereGeometry args={[radius, 40, 40]} />
          <meshStandardMaterial alphaMap={textures.earthClouds} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      </>
    )
  }

  if (type === 'venus') {
    return (
      <mesh scale={1.03}>
        <sphereGeometry args={[radius, 40, 40]} />
        <meshStandardMaterial map={textures.venusClouds} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    )
  }

  return (
    <mesh scale={1.025}>
      <sphereGeometry args={[radius, 40, 40]} />
      <meshBasicMaterial color="#dd6c30" transparent opacity={0.17} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  )
}

function SaturnRings({ texture, radius }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 1.15, radius * 2.41, 160]} />
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} transparent opacity={0.9} roughness={0.65} />
    </mesh>
  )
}

export function OrbitPath({ body, bodyRefs, settings }) {
  const orbitRef = useRef()
  const geometry = useMemo(() => createOrbitGeometry(body), [body])

  useFrame(() => {
    const parent = body.parent ? bodyRefs.current[body.parent] : null
    if (parent) orbitRef.current.position.copy(parent.position)
  })

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <line
      ref={orbitRef}
      geometry={geometry}
      visible={settings.showOrbits}
      rotation={[0, 0, THREE.MathUtils.degToRad(body.planeTilt || 0)]}
    >
      <lineBasicMaterial color="#ffffff" transparent opacity={settings.orbitOpacity} />
    </line>
  )
}

export function CelestialBody({
  body,
  textures,
  bodyRefs,
  settings,
  isSelected,
  isFocused,
  interactionDisabled,
  language,
  onSelect,
}) {
  const bodyRef = useRef()
  const surfaceRef = useRef()
  const simulationTime = useRef(0)
  const orbitalPosition = useMemo(() => new THREE.Vector3(), [])

  useLayoutEffect(() => {
    bodyRefs.current[body.name] = bodyRef.current
    return () => {
      if (bodyRefs.current[body.name] === bodyRef.current) delete bodyRefs.current[body.name]
    }
  }, [body.name, bodyRefs])

  useFrame((_, delta) => {
    simulationTime.current += delta * settings.timeScale
    const parent = body.parent ? bodyRefs.current[body.parent] : null
    setOrbitalPosition(orbitalPosition, body, simulationTime.current, parent?.position)
    bodyRef.current.position.copy(orbitalPosition)

    if (body.rotationAngularSpeed) {
      surfaceRef.current.rotation.y += body.rotationAngularSpeed * settings.timeScale * delta
    }
  })

  const selectBody = (event) => {
    event.stopPropagation()
    if (!interactionDisabled) onSelect(body.name)
  }

  const segments = body.emissive ? 64 : 48
  const labelHeight = body.renderRadius + Math.max(0.45, body.renderRadius * 0.13)

  return (
    <group ref={bodyRef}>
      <group
        ref={surfaceRef}
        rotation={[0, 0, THREE.MathUtils.degToRad(body.axialTilt || 0)]}
      >
        <mesh onPointerDown={selectBody}>
          <sphereGeometry args={[body.renderRadius, segments, segments]} />
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
        {settings.showAtmospheres && body.atmosphere && (
          <Atmosphere type={body.atmosphere} textures={textures} radius={body.renderRadius} />
        )}
        {settings.showRings && body.rings && (
          <SaturnRings texture={textures.saturnRings} radius={body.renderRadius} />
        )}
      </group>

      {settings.showLabels && (
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
            onPointerDown={selectBody}
          >
            <span aria-hidden="true">𐤏</span> {getBodyLabel(body.name, language)}
          </button>
        </Html>
      )}
    </group>
  )
}
