import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { COLOR_TEXTURE_KEYS } from '../data/celestialBodies'

export default function SceneEnvironment({ textures, settings }) {
  const { gl, scene } = useThree()

  useEffect(() => {
    const previousBackground = scene.background
    const previousBackgroundIntensity = scene.backgroundIntensity
    const maxAnisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 8)

    COLOR_TEXTURE_KEYS.forEach((key) => {
      textures[key].colorSpace = THREE.SRGBColorSpace
      textures[key].anisotropy = maxAnisotropy
      textures[key].needsUpdate = true
    })

    textures.earthNormal.colorSpace = THREE.NoColorSpace
    textures.earthClouds.colorSpace = THREE.NoColorSpace
    textures.stars.mapping = THREE.EquirectangularReflectionMapping
    textures.saturnRings.wrapS = THREE.RepeatWrapping
    textures.saturnRings.wrapT = THREE.RepeatWrapping
    scene.background = textures.stars

    return () => {
      if (scene.background === textures.stars) scene.background = previousBackground
      scene.backgroundIntensity = previousBackgroundIntensity
    }
  }, [gl, scene, textures])

  useEffect(() => {
    scene.backgroundIntensity = settings.backgroundIntensity
  }, [scene, settings.backgroundIntensity])

  return (
    <>
      <ambientLight intensity={settings.ambientIntensity} />
      <pointLight position={[0, 0, 0]} intensity={settings.sunLightIntensity} distance={0} decay={0} />
    </>
  )
}