import { OrbitControls, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import CameraRig from './components/CameraRig'
import { CelestialBody, OrbitPath } from './components/CelestialBody'
import SceneEnvironment from './components/SceneEnvironment'
import TravelShip from './components/TravelShip'
import { CELESTIAL_BODIES, ORBITING_BODIES, TEXTURE_PATHS } from './data/celestialBodies'

export default function SolarSystem({
  selectedBody,
  focusedBody,
  language,
  travelling,
  settings,
  onSelect,
  onTravellingChange,
  onTravelPreviewChange,
}) {
  const textures = useTexture(TEXTURE_PATHS)
  const bodyRefs = useRef(Object.create(null))
  const controlsRef = useRef()
  const simulationTimeRef = useRef(0)

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
            isSelected={body.name === selectedBody}
            isFocused={body.name === focusedBody}
            isParentFocused={!body.parent || body.parent === focusedBody}
            interactionDisabled={travelling}
            language={language}
            onSelect={onSelect}
          />
        ))}

        {ORBITING_BODIES.map((body) => (
          <OrbitPath key={`${body.name}-orbit`} body={body} bodyRefs={bodyRefs} settings={settings} />
        ))}
      </group>

      <OrbitControls
        ref={controlsRef}
        enabled={!travelling}
        enableDamping
        dampingFactor={0.06}
        enablePan={false}
        minDistance={0.0005 * settings.globalScale}
        maxDistance={1000000 * settings.globalScale}
      />
      <CameraRig
        selectedBody={selectedBody}
        focusedBody={focusedBody}
        bodyRefs={bodyRefs}
        controlsRef={controlsRef}
        settings={settings}
        onTravellingChange={onTravellingChange}
        onTravelPreviewChange={onTravelPreviewChange}
      />
      <TravelShip
        bodyRefs={bodyRefs}
        focusedBody={focusedBody}
        simulationTimeRef={simulationTimeRef}
        settings={settings}
      />
    </>
  )
}


