import CelestialBody from "./CelestialBody"
import * as THREE from 'three'


export default class Satelite extends CelestialBody{
    constructor(radius = 1000, orbitTarget, axialTilt, material = new THREE.MeshStandardMaterial()){
        super(radius, orbitTarget, material)
    }
    
}