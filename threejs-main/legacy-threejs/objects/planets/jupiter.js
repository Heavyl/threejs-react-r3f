import * as THREE from 'three'
import { textureLoader } from '../../components/loaders/textureLoader'
import Planet from '../../classes/Planet'
import { sun } from '../stars/sun'
import { au } from '../../globalParameters'

//------------------Jupiter---------------------


//Textures
const jupiterColorTexture = textureLoader.load('/textures/jupiter/jupiterColor.jpg')

//Materials
const jupiterMaterial = new THREE.MeshPhysicalMaterial({
  map : jupiterColorTexture
})

//Geometry
const jupiter = new Planet(71492, sun, 0, jupiterMaterial)

jupiter.isRotating = true
jupiter.isOrbiting = true
jupiter.orbitingSpeed = 13.058
jupiter.revolutionSpeed = 13.06
jupiter.name = 'Jupiter'
jupiter.planeTilt = ((Math.PI /360) *2 ) * 1.304
jupiter.axialTilt = ((Math.PI /360) *2 ) * 3.12
jupiter.orbitTarget = sun
jupiter.distanceFromTarget =  5.202 * au

jupiter.build()

export {jupiter}