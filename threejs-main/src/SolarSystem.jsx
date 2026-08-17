import { OrbitControls, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import CameraRig from './components/CameraRig'
import { CelestialBody, OrbitPath } from './components/CelestialBody'
import InternationalSpaceStation from './components/InternationalSpaceStation'
import SceneEnvironment from './components/SceneEnvironment'
import SpaceObservatories from './components/SpaceObservatories'
import TravelShip from './components/TravelShip'
import { CELESTIAL_BODIES, MOBILE_TEXTURE_PATHS, ORBITING_BODIES, TEXTURE_PATHS } from './data/celestialBodies'

export default function SolarSystem({
  selectedBody,
  shipFocused,
  focusedSpacecraft,
  focusedBody,
  language,
  travelling,
  instantTravelRequest,
  cameraLookRequest,
  settings,
  mobilePerformance,
  onSelect,
  onLabelSelect,
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

  return (
    <>
      <SceneEnvironment textures={textures} settings={settings} />

      <group scale={settings.globalScale}>
        {CELESTIAL_BODIES.map((body) => (
          <CelestialBody
            key={body.name}
            body={body}
            textures={textures}
            bodyRefs={bodyRefs}
            simulationTimeRef={simulationTimeRef}
            settings={settings}
            mobilePerformance={mobilePerformance}
            isSelected={body.name === selectedBody}
            isFocused={body.name === focusedBody}
            isParentFocused={!body.parent || body.parent === focusedBody}
            interactionDisabled={false}
            language={language}
            onSelect={onSelect}
            onLabelSelect={onLabelSelect}
          />
        ))}

        {ORBITING_BODIES.map((body) => (
          <OrbitPath key={`${body.name}-orbit`} body={body} bodyRefs={bodyRefs} settings={settings} mobilePerformance={mobilePerformance} />
        ))}

        {focusedBody === 'Earth' && (
          <>
            <InternationalSpaceStation
              bodyRefs={bodyRefs}
              focused={focusedSpacecraft === 'ISS'}
              mobilePerformance={mobilePerformance}
              onSelect={() => onSpacecraftSelect('ISS')}
              settings={settings}
              simulationTimeRef={simulationTimeRef}
              stationRef={issRef}
              visible
            />
            <SpaceObservatories
              bodyRefs={bodyRefs}
              focusedSpacecraft={focusedSpacecraft}
              hubbleRef={hubbleRef}
              jwstRef={jwstRef}
              mobilePerformance={mobilePerformance}
              onSelect={onSpacecraftSelect}
              settings={settings}
              simulationTimeRef={simulationTimeRef}
              visible
            />
          </>
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
      <TravelShip
        bodyRefs={bodyRefs}
        shipRef={shipRef}
        travelPositionRef={travelPositionRef}
        language={language}
        mobilePerformance={mobilePerformance}
        shipFocused={shipFocused}
        onSelect={onShipSelect}
        focusedBody={focusedBody}
        simulationTimeRef={simulationTimeRef}
        settings={settings}
      />
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
