import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

const CUTAWAY_ALIGNMENT_RADIANS = -Math.PI / 4
const CUT_FACE_START_RADIANS = -Math.PI / 2
const OPENING_DURATION_SECONDS = 1.45
const FIRST_FACE_START_RADIANS = -Math.PI * 0.75
const FIRST_FACE_END_RADIANS = -Math.PI / 2
const SECOND_FACE_START_RADIANS = Math.PI / 4
const SECOND_FACE_END_RADIANS = 0
const START_FIRST_NORMAL = new THREE.Vector3(-1, 0, -1).normalize()
const END_FIRST_NORMAL = new THREE.Vector3(-1, 0, 0)
const START_SECOND_NORMAL = new THREE.Vector3(1, 0, 1).normalize()
const END_SECOND_NORMAL = new THREE.Vector3(0, 0, -1)

function CutFace({ config, faceRef, radius, rotation, selectedSectionId, onSelectSection }) {
  return (
    <group ref={faceRef} rotation={rotation}>
      {config.sections.map((section) => {
        const selected = section.id === selectedSectionId
        return (
          <mesh
            key={section.id}
            position={[0, 0, 0.00002 * radius]}
            onPointerDown={(event) => {
              event.stopPropagation()
              onSelectSection(section.id)
            }}
          >
            <ringGeometry args={[
              section.innerRadiusRatio * radius,
              section.outerRadiusRatio * radius,
              96,
              1,
              CUT_FACE_START_RADIANS,
              Math.PI,
            ]} />
            <meshStandardMaterial
              color={section.color}
              emissive={selected ? section.color : '#000000'}
              emissiveIntensity={selected ? 0.26 : 0}
              roughness={0.74}
              metalness={section.id.includes('core') ? 0.18 : 0.03}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </group>
  )
}

export default function PlanetAnalysisView({
  closing,
  config,
  language,
  normalMap,
  onCloseComplete,
  onSelectSection,
  radius,
  selectedSectionId,
  surfaceGeometry,
  surfaceSegments,
  texture,
}) {
  const { camera, gl } = useThree()
  const openingOrientationRef = useRef()
  const cutawayRef = useRef()
  const firstFaceRef = useRef()
  const secondFaceRef = useRef()
  const openingElapsed = useRef(0)
  const closeCompleteNotified = useRef(false)
  const orientationInitialized = useRef(false)
  const clippingPlanes = useMemo(
    () => [new THREE.Plane(), new THREE.Plane()],
    [],
  )
  const localFirstNormal = useMemo(() => new THREE.Vector3(), [])
  const localSecondNormal = useMemo(() => new THREE.Vector3(), [])
  const worldFirstNormal = useMemo(() => new THREE.Vector3(), [])
  const worldSecondNormal = useMemo(() => new THREE.Vector3(), [])
  const cutawayWorldPosition = useMemo(() => new THREE.Vector3(), [])
  const cutawayNormalMatrix = useMemo(() => new THREE.Matrix3(), [])
  const labelPositions = useMemo(
    () => config.sections.map((section) => section.labelPosition.map((value) => value * radius)),
    [config, radius],
  )
  const cutawayRadius = radius * (config.cutawayRadiusRatio ?? 1)

  useEffect(() => {
    const previousLocalClipping = gl.localClippingEnabled
    gl.localClippingEnabled = true
    return () => {
      gl.localClippingEnabled = previousLocalClipping
    }
  }, [gl])

  useEffect(() => {
    if (!closing) closeCompleteNotified.current = false
  }, [closing])

  useFrame((_, delta) => {
    if (!openingOrientationRef.current || !cutawayRef.current) return
    if (!orientationInitialized.current) {
      openingOrientationRef.current.lookAt(camera.position)
      orientationInitialized.current = true
    }

    openingElapsed.current = THREE.MathUtils.clamp(
      openingElapsed.current + (closing ? -delta : delta),
      0,
      OPENING_DURATION_SECONDS,
    )
    const linearProgress = openingElapsed.current / OPENING_DURATION_SECONDS
    const openingProgress = linearProgress * linearProgress * (3 - 2 * linearProgress)

    firstFaceRef.current.rotation.y = THREE.MathUtils.lerp(
      FIRST_FACE_START_RADIANS,
      FIRST_FACE_END_RADIANS,
      openingProgress,
    )
    secondFaceRef.current.rotation.y = THREE.MathUtils.lerp(
      SECOND_FACE_START_RADIANS,
      SECOND_FACE_END_RADIANS,
      openingProgress,
    )

    cutawayRef.current.updateWorldMatrix(true, false)
    cutawayRef.current.getWorldPosition(cutawayWorldPosition)
    cutawayNormalMatrix.getNormalMatrix(cutawayRef.current.matrixWorld)
    localFirstNormal
      .copy(START_FIRST_NORMAL)
      .lerp(END_FIRST_NORMAL, openingProgress)
      .normalize()
    localSecondNormal
      .copy(START_SECOND_NORMAL)
      .lerp(END_SECOND_NORMAL, openingProgress)
      .normalize()
    worldFirstNormal
      .copy(localFirstNormal)
      .applyNormalMatrix(cutawayNormalMatrix)
      .normalize()
    worldSecondNormal
      .copy(localSecondNormal)
      .applyNormalMatrix(cutawayNormalMatrix)
      .normalize()
    clippingPlanes[0].setFromNormalAndCoplanarPoint(
      worldFirstNormal,
      cutawayWorldPosition,
    )
    clippingPlanes[1].setFromNormalAndCoplanarPoint(
      worldSecondNormal,
      cutawayWorldPosition,
    )

    if (
      closing
      && openingElapsed.current === 0
      && !closeCompleteNotified.current
    ) {
      closeCompleteNotified.current = true
      onCloseComplete()
    }
  })

  return (
    <group>
      <mesh geometry={surfaceGeometry} scale={surfaceGeometry ? radius : 1}>
        {!surfaceGeometry && (
          <sphereGeometry args={[radius, surfaceSegments, surfaceSegments]} />
        )}
        <meshStandardMaterial
          map={texture}
          normalMap={normalMap}
          color="#ffffff"
          roughness={0.82}
          metalness={0}
          clippingPlanes={clippingPlanes}
          clipIntersection
          side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={openingOrientationRef}>
        <group ref={cutawayRef} rotation={[0, CUTAWAY_ALIGNMENT_RADIANS, 0]}>
          <group>
            <CutFace
              config={config}
              faceRef={firstFaceRef}
              radius={cutawayRadius}
              rotation={[0, FIRST_FACE_START_RADIANS, 0]}
              selectedSectionId={selectedSectionId}
              onSelectSection={onSelectSection}
            />
            <CutFace
              config={config}
              faceRef={secondFaceRef}
              radius={cutawayRadius}
              rotation={[0, SECOND_FACE_START_RADIANS, 0]}
              selectedSectionId={selectedSectionId}
              onSelectSection={onSelectSection}
            />
          </group>

          {config.sections.map((section, index) => (
            <Html
              key={section.id}
              center
              position={labelPositions[index]}
              wrapperClass={`analysis-layer-label-wrapper${closing ? ' is-closing' : ''}`}
              zIndexRange={[24, 0]}
            >
              <button
                className={`analysis-layer-label${section.id === selectedSectionId ? ' is-active' : ''}`}
                style={{ '--analysis-layer-color': section.color }}
                type="button"
                disabled={closing}
                onPointerDown={(event) => {
                  event.stopPropagation()
                  onSelectSection(section.id)
                }}
              >
                <span aria-hidden="true" />
                {section.name[language]}
              </button>
            </Html>
          ))}
        </group>
      </group>
    </group>
  )
}
