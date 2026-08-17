import { OrbitControls, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import CameraRig from './components/CameraRig'
import { CelestialBody, OrbitPath } from './components/CelestialBody'
import InternationalSpaceStation from './components/InternationalSpaceStation'
import SceneEnvironment from './components/SceneEnvironment'
import SpaceObservatories from './components/SpaceObservatories'
import TravelShip from './components/TravelShip'
import { CELESTIAL_BODIES, MOBILE_TEXTURE_PATHS, ORBITING_BODIES, TEXTURE_PATHS } from './data/celestialBodies'

const ANALYSIS_SCENE_FADE_SPEED = 4.2

function FadingSceneGroup({ children, hidden }) {
  const groupRef = useRef()
  const opacityRef = useRef(1)
  const materialStatesRef = useRef([])

  const collectMaterialStates = () => {
    const materials = new Set()
    groupRef.current?.traverse((object) => {
      if (!object.material) return
      const objectMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material]
      objectMaterials.forEach((material) => materials.add(material))
    })
    materialStatesRef.current = [...materials].map((material) => ({
      material,
      opacity: material.opacity,
      transparent: material.transparent,
      depthWrite: material.depthWrite,
      uniformOpacity: material.uniforms?.uOpacity?.value,
    }))
  }

  useLayoutEffect(() => {
    collectMaterialStates()

    return () => {
      materialStatesRef.current.forEach((state) => {
        state.material.opacity = state.opacity
        state.material.transparent = state.transparent
        state.material.depthWrite = state.depthWrite
        if (state.uniformOpacity !== undefined) {
          state.material.uniforms.uOpacity.value = state.uniformOpacity
        }
        state.material.needsUpdate = true
      })
    }
  }, [])

  useLayoutEffect(() => {
    // The analyzed body swaps its normal surface for a cutaway. Refresh the
    // cache when that body later becomes part of the fading background.
    if (hidden) collectMaterialStates()
  }, [hidden])

  useFrame((_, delta) => {
    opacityRef.current = THREE.MathUtils.damp(
      opacityRef.current,
      hidden ? 0 : 1,
      ANALYSIS_SCENE_FADE_SPEED,
      delta,
    )
    const opacity = opacityRef.current
    if (groupRef.current) groupRef.current.visible = opacity > 0.002

    materialStatesRef.current.forEach((state) => {
      const useTransparency = state.transparent || opacity < 0.999
      if (state.material.transparent !== useTransparency) {
        state.material.transparent = useTransparency
        state.material.needsUpdate = true
      }
      state.material.opacity = state.opacity * opacity
      state.material.depthWrite = state.depthWrite && opacity > 0.98
      if (state.uniformOpacity !== undefined) {
        state.material.uniforms.uOpacity.value = state.uniformOpacity * opacity
      }
    })
  })

  return <group ref={groupRef}>{children}</group>
}

export default function SolarSystem({
  selectedBody,
  shipFocused,
  focusedSpacecraft,
  focusedBody,
  language,
  analysisConfig,
  analysisClosing,
  analysisSectionId,
  travelling,
  instantTravelRequest,
  cameraLookRequest,
  settings,
  mobilePerformance,
  onSelect,
  onLabelSelect,
  onAnalysisSectionSelect,
  onAnalysisCloseComplete,
  onShipSelect,
  onSpacecraftSelect,
  onTravellingChange,
  onTravelPreviewChange,
}) {
  const textures = useTexture(mobilePerformance ? MOBILE_TEXTURE_PATHS : TEXTURE_PATHS)
  const bodyRefs = useRef(Object.create(null))
  const controlsRef = useRef()
  const simulationTimeRef = useRef(0)
  const shipRef = useRef()
  const issRef = useRef()
  const hubbleRef = useRef()
  const jwstRef = useRef()
  const travelPositionRef = useRef()

  useFrame((_, delta) => {
    simulationTimeRef.current += delta * settings.timeScale
  }, -100)

  const layeredAnalysisActive = analysisConfig?.type === 'layered-body'

  return (
    <>
      <SceneEnvironment textures={textures} settings={settings} />

      <group scale={settings.globalScale}>
        {CELESTIAL_BODIES.map((body) => {
          const hiddenByAnalysis = Boolean(
            layeredAnalysisActive
            && body.name !== analysisConfig.id
            && !analysisClosing
          )
          return (
            <FadingSceneGroup key={body.name} hidden={hiddenByAnalysis}>
              <CelestialBody
                body={body}
                textures={textures}
                bodyRefs={bodyRefs}
                simulationTimeRef={simulationTimeRef}
                settings={settings}
                mobilePerformance={mobilePerformance}
                isSelected={body.name === selectedBody}
                isFocused={body.name === focusedBody}
                isParentFocused={!body.parent || body.parent === focusedBody}
                visible
                interactionDisabled={layeredAnalysisActive && body.name !== analysisConfig.id}
                language={language}
                analysisConfig={(
                  analysisConfig?.type === 'layered-body'
                  && analysisConfig.id === body.name
                ) ? analysisConfig : null}
                analysisClosing={analysisClosing}
                selectedAnalysisSectionId={analysisSectionId}
                onAnalysisSectionSelect={onAnalysisSectionSelect}
                onAnalysisCloseComplete={onAnalysisCloseComplete}
                onSelect={onSelect}
                onLabelSelect={onLabelSelect}
              />
            </FadingSceneGroup>
          )
        })}

        {ORBITING_BODIES.map((body) => (
          <OrbitPath
            key={`${body.name}-orbit`}
            analysisHidden={layeredAnalysisActive && !analysisClosing}
            body={body}
            bodyRefs={bodyRefs}
            settings={settings}
            mobilePerformance={mobilePerformance}
            simulationTimeRef={simulationTimeRef}
          />
        ))}

        {focusedBody === 'Earth' && (
          <FadingSceneGroup hidden={layeredAnalysisActive && !analysisClosing}>
            <InternationalSpaceStation
              analysisClosing={analysisClosing}
              analysisConfig={analysisConfig?.id === 'ISS' ? analysisConfig : null}
              analysisSectionId={analysisSectionId}
              bodyRefs={bodyRefs}
              focused={focusedSpacecraft === 'ISS'}
              mobilePerformance={mobilePerformance}
              language={language}
              onAnalysisSectionSelect={onAnalysisSectionSelect}
              onSelect={() => onSpacecraftSelect('ISS')}
              settings={settings}
              simulationTimeRef={simulationTimeRef}
              stationRef={issRef}
              visible
            />
            <SpaceObservatories
              analysisClosing={analysisClosing}
              analysisConfig={analysisConfig}
              analysisSectionId={analysisSectionId}
              bodyRefs={bodyRefs}
              focusedSpacecraft={focusedSpacecraft}
              hubbleRef={hubbleRef}
              jwstRef={jwstRef}
              mobilePerformance={mobilePerformance}
              language={language}
              onAnalysisSectionSelect={onAnalysisSectionSelect}
              onSelect={onSpacecraftSelect}
              settings={settings}
              simulationTimeRef={simulationTimeRef}
              visible
            />
          </FadingSceneGroup>
        )}
      </group>

      <OrbitControls
        ref={controlsRef}
        enabled
        enableDamping
        dampingFactor={0.06}
        enablePan={false}
        minDistance={((focusedSpacecraft || shipFocused) ? 0.000000002 : 0.0005) * settings.globalScale}
        maxDistance={1000000 * settings.globalScale}
      />
      <FadingSceneGroup hidden={layeredAnalysisActive && !analysisClosing}>
        <TravelShip
          analysisClosing={analysisClosing}
          analysisConfig={analysisConfig}
          analysisSectionId={analysisSectionId}
          bodyRefs={bodyRefs}
          shipRef={shipRef}
          travelPositionRef={travelPositionRef}
          language={language}
          mobilePerformance={mobilePerformance}
          onAnalysisSectionSelect={onAnalysisSectionSelect}
          shipFocused={shipFocused}
          onSelect={onShipSelect}
          focusedBody={focusedBody}
          simulationTimeRef={simulationTimeRef}
          settings={settings}
        />
      </FadingSceneGroup>
      <CameraRig
        selectedBody={selectedBody}
        focusedBody={focusedBody}
        bodyRefs={bodyRefs}
        instantTravelRequest={instantTravelRequest}
        cameraLookRequest={cameraLookRequest}
        controlsRef={controlsRef}
        settings={settings}
        shipFocused={shipFocused}
        focusedSpacecraft={focusedSpacecraft}
        spacecraftRefs={{ ISS: issRef, Hubble: hubbleRef, JWST: jwstRef }}
        shipRef={shipRef}
        travelPositionRef={travelPositionRef}
        onTravellingChange={onTravellingChange}
        onTravelPreviewChange={onTravelPreviewChange}
      />
    </>
  )
}
