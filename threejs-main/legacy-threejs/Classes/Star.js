import CelestialBody from "./CelestialBody";
import * as THREE from 'three'

/**
 * CELESTIAL BODY
 * @param {Number} radius The radius of the celestial body ( in kilometers )
 * @param {THREE.Object3D} orbitTarget The THREE.Object3D target to orbit around
 * @param {THREE.Material} material The material Object for the body
 */
export default class Star extends CelestialBody{
    constructor(radius = 1000, orbitTarget, material ){
        super(radius, material, orbitTarget)

        this.body.name ='Star'
        
        //Light Parameters
        this.lightRange = 0
        this.lightDecay = 0.4
        this.color = new THREE.Color
        this.intensity = 100
        
    }    
    build(){
        super.build()
        this.light = new THREE.PointLight(this.color, this.intensity, this.lightRange, this.lightDecay)
        this.light.name = 'light'
        this.body.add(this.light)
    }
}