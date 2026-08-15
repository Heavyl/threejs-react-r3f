import { globalMeshResolution } from "../globalParameters";
import * as THREE from 'three'
import CelestialBody from "./CelestialBody";
import { clamp } from "three/src/math/MathUtils.js";



/**
 * @param { CelestialBody} target Targeted celestial body to get distance and orbit data from
 * @param { THREE.Color} color the color of the  path
 */
export default class OrbitPath{
    constructor( target, color = 0xffffff){
        this.target = target
        this.color = color
        this.resolution = globalMeshResolution

        const curve = new THREE.EllipseCurve(
            this.target.orbitTarget.position.x,  this.target.orbitTarget.position.y,  // ax, aY
            this.target.computedDistance, this.target.computedDistance, // xRadius, yRadius
            0,  2 * Math.PI,  // aStartAngle, aEndAngle
            false,            // aClockwise
        )
        
        const pointsNumber = clamp(
            this.target.computedDistance * 2 * Math.PI,
            this.resolution,
            this.resolution * 10
        )
        const points = curve.getPoints( Math.round(pointsNumber) )
        const geometry = new THREE.BufferGeometry().setFromPoints( points )
      
        const material = new THREE.LineBasicMaterial({ 
            transparent : true,
            opacity : 0.05,
            color: this.color 
        })
        const ellipse = new THREE.Line( geometry, material)        
        ellipse.rotateX(Math.PI/2)
        ellipse.name = this.target.name + "'s Orbit"

        return ellipse
    }

}