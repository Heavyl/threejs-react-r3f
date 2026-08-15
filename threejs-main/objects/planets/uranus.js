import * as THREE from 'three'
import { textureLoader } from '../../components/loaders/textureLoader'
import Planet from '../../classes/Planet'
import { sun } from '../stars/sun'
import { au } from '../../globalParameters'


//------------------Uranus---------------------

//Textures
const uranusColorTexture = textureLoader.load('/textures/uranus/uranusColor.jpg')

//Materials
const uranusMaterial = new THREE.MeshPhysicalMaterial({
  map : uranusColorTexture,
  roughness : 0.8
})

//Geometry
const uranus = new Planet(25362, sun, 0, uranusMaterial)

uranus.isRotating = true
uranus.isOrbiting = true
uranus.orbitingSpeed = 6.835
uranus.revolutionSpeed = 2.59
uranus.name = 'Uranus'
uranus.planeTilt = ((Math.PI /360) *2 ) * 0.773
uranus.axialTilt = ((Math.PI /360) *2 ) * 97.8
uranus.orbitTarget = sun
uranus.distanceFromTarget =  19.189 * au

uranus.build()

export {uranus}