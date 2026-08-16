import { useCubeTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import {
  COLOR_TEXTURE_KEYS,
  SKYBOX_BASE_PATH,
  SKYBOX_FACE_FILES,
} from '../data/celestialBodies'

export default function SceneEnvironment({ textures, settings }) {
  const skybox = useCubeTexture(SKYBOX_FACE_FILES, { path: SKYBOX_BASE_PATH })
  const { gl, scene } = useThree()

  useEffect(() => {
    const previousBackground = scene.background
    const previousBackgroundIntensity = scene.backgroundIntensity
    const previousBackgroundBlurriness = scene.backgroundBlurriness
    const maxAnisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 8)

    COLOR_TEXTURE_KEYS.forEach((key) => {
      textures[key].colorSpace = THREE.SRGBColorSpace
      textures[key].anisotropy = maxAnisotropy
      textures[key].needsUpdate = true
    })

    textures.earthNormal.colorSpace = THREE.NoColorSpace
    textures.earthClouds.colorSpace = THREE.NoColorSpace
    skybox.colorSpace = THREE.SRGBColorSpace
    skybox.generateMipmaps = false
    skybox.minFilter = THREE.LinearFilter
    skybox.magFilter = THREE.LinearFilter
    skybox.needsUpdate = true

    textures.saturnRings.wrapS = THREE.RepeatWrapping
    textures.saturnRings.wrapT = THREE.RepeatWrapping
    scene.background = skybox
    scene.backgroundBlurriness = 0

    return () => {
      if (scene.background === skybox) scene.background = previousBackground
      scene.backgroundIntensity = previousBackgroundIntensity
      scene.backgroundBlurriness = previousBackgroundBlurriness
    }
  }, [gl, scene, skybox, textures])

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