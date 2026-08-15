import * as THREE from 'three'
import { textureLoader } from '../../components/loaders/textureLoader'
import Planet from '../../classes/Planet'
import { sun } from '../stars/sun'
import { au } from '../../globalParameters'


//------------------Venus---------------------

//Textures
const venusColorTexture = textureLoader.load('/textures/venus/venusColor.jpg')
const venusClouds = textureLoader.load('/textures/venus/venusClouds.jpg')

//Geometry
const venusMaterial = new THREE.MeshPhysicalMaterial({
  map : venusColorTexture
})
const venus = new Planet(6051, sun, 0, venusMaterial)

venus.isRotating = true
venus.isOrbiting = true
venus.orbitingSpeed = 35.025
venus.revolutionSpeed = 0.0018
venus.name = 'Venus'
venus.planeTilt = ((Math.PI /360) *2 ) * 3.4
venus.axialTilt = ((Math.PI /360) *2 ) * 177.3
venus.orbitTarget = sun
venus.distanceFromTarget =  0.723 * au

venus.build()

//Venus Atmosphere
const venusAtmosphereMaterial = new THREE.MeshStandardMaterial({
  name: 'Outline material',
  transparent : true,
  opacity: 0.1,
  side : THREE.BackSide,
  color: new THREE.Color(255,10, 10),
  depthWrite : false
})
const venusAtmosphereMaterial2 = new THREE.MeshStandardMaterial({
  name: 'Diffuse atmosphere',
  transparent : true,
  opacity: 0,
  color: new THREE.Color(255, 255, 255),
  depthWrite : false,
})

venus.atmosphere.thickness = 200
const venusAtmosphereMaterials = [venusAtmosphereMaterial, venusAtmosphereMaterial2]
venus.atmosphere.addLayer(2, venusAtmosphereMaterials)
venus.body.add(venus.atmosphere.layers)

//Low atmosphere
const venusLowAtmosphereMaterial = new THREE.MeshStandardMaterial({
  map : venusClouds,
  name :'Low atmosphere Clouds',
  transparent: true,
  opacity : 0.4,
})
venus.lowAtmosphere.addLayer(5, venusLowAtmosphereMaterial, 10 )
venus.body.add(venus.lowAtmosphere.layers)

export {venus}