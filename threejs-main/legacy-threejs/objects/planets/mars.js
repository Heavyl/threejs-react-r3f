import * as THREE from 'three'
import { textureLoader } from '../../components/loaders/textureLoader'
import Planet from '../../classes/Planet'
import { sun } from '../stars/sun'
import { au } from '../../globalParameters'
import Satelite from '../../classes/Satelite'



//------------------Mars---------------------

//Textures
const marsColorTexture = textureLoader.load('/textures/mars/marsColor.jpg')

//Materials
const marsMaterial = new THREE.MeshPhysicalMaterial({
    map : marsColorTexture
  })

//Geometry
const mars = new Planet(3389, sun, 0, marsMaterial)

mars.isRotating = true
mars.isOrbiting = true
mars.orbitingSpeed = 24.13
mars.revolutionSpeed = 0.24
mars.name = 'Mars'
mars.planeTilt = ((Math.PI /360) *2 ) * 1.85
mars.axialTilt = ((Math.PI /360) *2 ) * 25.2
mars.orbitTarget = sun
mars.distanceFromTarget =  1.523 * au

mars.build()

//Atmosphere
const marsAtmosphereMaterial = new THREE.MeshStandardMaterial({
  name: 'Outline material',
  transparent : true,
  opacity: 0.2,
  side : THREE.BackSide,
  color: new THREE.Color(255,10, 10),
  depthWrite : false
})
const marsAtmosphereMaterial2 = new THREE.MeshStandardMaterial({
  name: 'Diffuse atmosphere',
  transparent : true,
  opacity: 0.1,
  color: new THREE.Color(255, 200, 10),
  depthWrite : false,
})

mars.atmosphere.thickness = 100
const marsAtmosphereMaterials = [marsAtmosphereMaterial, marsAtmosphereMaterial2]
mars.atmosphere.addLayer(2, marsAtmosphereMaterials)
mars.body.add(mars.atmosphere.layers)


//------------- Deimos ---------------

const deimosMaterial = new THREE.MeshPhysicalMaterial(0xffffff)
const deimos = new Satelite(15, mars, 0, deimosMaterial)
deimos.isOrbiting = true
deimos.orbitingSpeed = 1.35
deimos.revolutionSpeed = 0.24
deimos.orbitTarget = mars
deimos.name = 'Deimos'
deimos.planeTilt = ((Math.PI /360) *2 ) * 27.58
deimos.distanceFromTarget =  0.00015 * au

deimos.build()

//------------- Phobos -----------------

const phobosMaterial = new THREE.MeshPhysicalMaterial(0xffffff)
const phobos = new Satelite(25.90, mars, 0, phobosMaterial)
phobos.isOrbiting = true
phobos.orbitingSpeed = 2.138
phobos.revolutionSpeed = 0.24
phobos.orbitTarget = mars
phobos.name = 'Phobos'
phobos.planeTilt = ((Math.PI /360) *2 ) * 26.04
phobos.distanceFromTarget =  0.0000626 * au

phobos.build()

export {mars, deimos, phobos}