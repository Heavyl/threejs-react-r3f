import * as THREE from 'three'
import { textureLoader } from '../../components/loaders/textureLoader'
import Planet from '../../classes/Planet'
import Satelite from '../../classes/Satelite'
import { sun } from '../stars/sun'
import { au } from '../../globalParameters'



//---------------Earth-------------------

//textures
const earthColorTexture = textureLoader.load('/textures/earth/earthColor.jpg')
const earthCloudTexture = textureLoader.load('/textures/earth/earthClouds.jpg')
const earthNormalTexture = textureLoader.load('/textures/earth/earthNormal.jpg')
const earthSpecularTexture = textureLoader.load('/textures/earth/earthSpecular.jpg')
const moonColorTexture = textureLoader.load('/textures/moon/moonColor.jpg') 


//materials
const earthMaterial = new THREE.MeshStandardMaterial({
  map : earthColorTexture,
  aoMap : earthSpecularTexture,
  roughness :  1,
  bumpMap : earthNormalTexture, 
  bumpScale : -3
})

//Geometry
const earth = new Planet(6371, null, 23.5, earthMaterial)
earth.revolutionSpeed = 0.465
earth.orbitingSpeed = 29.72
earth.isRotating = true
earth.isOrbiting = true
earth.name = 'Earth'
earth.orbitTarget = sun
earth.distanceFromTarget = 1 * au 
earth.orbitPathColor = 0xffffff

earth.build()

//Atmosphere
const atmosphereMaterial = new THREE.MeshStandardMaterial({
  name: 'Outline material',
  transparent : true,
  opacity: 0.5,
  side : THREE.BackSide,
  color: new THREE.Color(0, 5, 255),
  depthWrite : false
})
const atmosphereMaterial2 = new THREE.MeshStandardMaterial({
  name: 'Diffuse atmosphere',
  roughness: 1,
  transparent : true,
  opacity: 0.2,
  color: new THREE.Color(0, 5, 255),
  depthWrite : false
  
})
earth.atmosphere.thickness = 300
const atmosphereMaterials = [atmosphereMaterial, atmosphereMaterial2]
earth.atmosphere.addLayer(2, atmosphereMaterials)
earth.body.add(earth.atmosphere.layers)

//Low atmosphere
const lowAtmosphereMaterial = new THREE.MeshStandardMaterial({
  name :'Low atmosphere Clouds',
  transparent: true,
  alphaMap : earthCloudTexture,
  opacity : 0.2,
})
earth.lowAtmosphere.addLayer(10, lowAtmosphereMaterial, 10 )
earth.body.add(earth.lowAtmosphere.layers)

//------------ Moon --------------

const moonMaterial = new THREE.MeshPhysicalMaterial({
  map : moonColorTexture
})
const moon = new Satelite(1737, earth, 0, moonMaterial)
moon.isOrbiting = true
moon.orbitDirection = -10
moon.orbitingSpeed = 10.02
moon.name = 'Moon'
moon.orbitTarget = earth
moon.planeTilt = ((Math.PI /360) *2 ) * 5.68
moon.axialTilt = ((Math.PI /360) *2 ) * 6.68
moon.distanceFromTarget = 0.0025 * au
moon.build()

export {earth, moon}