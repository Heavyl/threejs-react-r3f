import * as THREE from 'three'
import { textureLoader } from '../../components/loaders/textureLoader'
import Planet from '../../classes/Planet'
import { sun } from '../stars/sun'
import { au } from '../../globalParameters'


//------------------Mercury---------------------

//Textures
const mercuryColorTexture = textureLoader.load('/textures/mercury/mercuryColor.jpg')

//Materials
const mercuryMaterial = new THREE.MeshPhysicalMaterial({
    map : mercuryColorTexture
})

//Geometry 
const mercury = new Planet(2439, sun, 0, mercuryMaterial)

mercury.isOrbiting = true
mercury.orbitingSpeed = 47.362
mercury.isRotating = true
mercury.revolutionSpeed = 0.003
mercury.name = 'Mercury'
mercury.planeTilt = ((Math.PI /360) *2 ) * 7
mercury.axialTilt = ((Math.PI /360) *2 ) * 0.035
mercury.orbitTarget = sun
mercury.distanceFromTarget =  0.4 * au

mercury.build()

export {mercury}