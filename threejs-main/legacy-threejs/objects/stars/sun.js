import * as THREE from 'three'
import Star from '../../classes/Star'
import { textureLoader } from '../../components/loaders/textureLoader'


//-----------------sun------------------

//Textures
const sunColorTexture = textureLoader.load('/textures/sun/sunColor.jpg')

//Geometry

const sunMaterial = new THREE.MeshPhysicalMaterial({
    name : 'Sun Surface',
    emissiveMap: sunColorTexture,
    emissive: 'white',
    emissiveIntensity: 1
  })
  const sunSurfaceMaterial = new THREE.MeshPhysicalMaterial({
    emissive: 'yellow',
    transparent:true,
    opacity: 1
  })
  const sun = new Star( 696342, sunMaterial)
  sun.name = 'Sun'
  sun.intensity = 50
  sun.build()

  export {sun}