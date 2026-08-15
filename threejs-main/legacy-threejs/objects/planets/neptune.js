import * as THREE from 'three'
import { textureLoader } from '../../components/loaders/textureLoader'
import Planet from '../../classes/Planet'
import { sun } from '../stars/sun'
import { au } from '../../globalParameters'



//------------------Neptune---------------------

//Textures
const neptuneColorTexture = textureLoader.load('/textures/neptune/neptuneColor.jpg')

//Materials
const neptuneMaterial = new THREE.MeshPhysicalMaterial({
    map : neptuneColorTexture,
})

//Geometry
const neptune = new Planet(24622, sun, 0, neptuneMaterial)

neptune.isRotating = true
neptune.isOrbiting = true
neptune.orbitingSpeed = 5.43
neptune.revolutionSpeed = 2.68
neptune.name = 'Neptune'
neptune.planeTilt = ((Math.PI /360) *2 ) * 1.304
neptune.axialTilt = ((Math.PI /360) *2 ) * 28.32
neptune.orbitTarget = sun
neptune.distanceFromTarget =  30.069 * au

neptune.build()

export {neptune}
  