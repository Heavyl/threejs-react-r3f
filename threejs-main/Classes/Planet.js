import * as THREE from 'three'
import CelestialBody from './CelestialBody'
import degreeToRadian from '/functions/Utility/degreeToRadian'
import Atmosphere from './Atmosphere'


/**
 * Planet Classe : extends from Celestial Body
 * @param {Number} radius The radius of the celestial body ( in kilometers )
 * @param {THREE.Object3D} orbitTarget The THREE.Object3D to orbit around
 * @param {Number} axialTilt The axial tilt of the body ( in degrees )
 * @param {THREE.Material} material The material Object for the body
 */

export default class Planet extends CelestialBody{
    constructor(radius = 1000, orbitTarget, axialTilt, material = new THREE.MeshStandardMaterial()){
  
      super(radius, orbitTarget, material)

      //Axial tilt
      this.axialTilt = degreeToRadian(axialTilt)
     
      //Atmosphere setup :
      this.atmosphere = new Atmosphere(this.radius, 600)
      this.lowAtmosphere = new Atmosphere(this.radius, this.radius /100)
      
      this.name = 'planet'
      this.satelites = new THREE.Group()
    } 
  }