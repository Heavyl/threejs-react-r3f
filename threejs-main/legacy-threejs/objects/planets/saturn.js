import * as THREE from 'three'
import { textureLoader } from '../../components/loaders/textureLoader'
import Planet from '../../classes/Planet'
import { sun } from '../stars/sun'
import { au } from '../../globalParameters'
import Ring from '../../classes/Ring'

//------------------Saturn---------------------

//Textures
const saturnColorTexture = textureLoader.load('/textures/saturn/saturnColor.jpg')
const saturnRingsTexture = textureLoader.load('/textures/saturn/saturnRings.png')
saturnRingsTexture.wrapS = saturnRingsTexture.wrapT = THREE.RepeatWrapping

//Materials
const saturnMaterial = new THREE.MeshStandardMaterial({
    map : saturnColorTexture,
    roughness : 1
  })

//Geometry
const saturn = new Planet(58232, sun, 0, saturnMaterial)

saturn.isRotating = true
saturn.isOrbiting = true
saturn.orbitingSpeed = 9.6725
saturn.revolutionSpeed = 9.68
saturn.name = 'Saturn'
saturn.planeTilt = ((Math.PI /360) *2 ) * 2.485
saturn.axialTilt = ((Math.PI /360) *2 ) * 26.73
saturn.orbitTarget = sun
saturn.distanceFromTarget =  9.5 * au

saturn.build()

//Rings
const saturnRingsMaterial = new THREE.MeshStandardMaterial({
    map : saturnRingsTexture,
    // alphaMap : saturnRingsTexture,
    side: THREE.DoubleSide,
    transparent : true,
    opacity : 1,
    roughness : 0.5
    
})
saturn.receiveShadow = true
saturn.castShadow = true
saturn.body.add( new Ring(saturn, 135000, saturn.radius + 10000, saturnRingsMaterial))

export {saturn} 