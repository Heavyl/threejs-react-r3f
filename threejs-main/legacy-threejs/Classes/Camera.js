import * as THREE from 'three'
import { STATE } from '../data/state'
import { easeInOutCubic, easeInSine, easeOutSine } from '../functions/transitions'


export default class Camera extends THREE.PerspectiveCamera{
    constructor(){
        super()
        this.fov
        this.target 
        this.oldTargetCoordinate = new THREE.Vector3()
        this.coordinates = this.position
        this.nextTarget = null
        this.focalLength = 35
        this.miniFocalLength = 0
        //Travelling
        this.travelSpeed = 1
        this.distanceToNext = 0 //Distance from camera to next target object
        this.distanceToLast = 0
        this.distanceToTarget = 0 //Distance from camera to actual camera target
        this.travelStartAt = 0

        this.setFocalLength(35)
    }
    /**
     * Keeps track of target old coordonate.Used to calculate delta with next coordonate.
     */
    getOldCoord(){
        this.target.body.getWorldPosition(this.oldTargetCoordinate)  
    }
    /**
     * Get delta between old camera target position and new camera target position
     * Used to "follow" target.
     * @returns {THREE.Vector3}
     */
    getDelta(){
        return this
            .target
            .coordinate
            .clone()
            .sub(this.oldTargetCoordinate)
    }
    /**
     * Calculate distance between camera target position
     * @param {THREE.Object3D} target 
     */
    distanceTo(target){
        return this.position.distanceTo(target.coordinate)
    }

    /**
     * Camera travel animation logic through time
     * @param {Number} time THREE.Clock elapsed time
     * @returns 
     */
    travel(time){            
        //set travel start time. Based on THREE.Clock time
        if(this.travelStartAt === 0){
            this.travelStartAt = time
            this.lastPosition = this.position.clone()
        }
        
        //Calculate travel time in function of distance to target
        const duration =  time - this.travelStartAt        
        const travelTime =  Math.max(3, this.distanceToNext / this.travelSpeed)
        const distance = this.position.clone().distanceTo(this.target.coordinate)
        this.distanceToLast = this.lastPosition.distanceTo(this.position)
        
        //Do this while elapsed time inferior to travel time
        if( duration <= travelTime ){  
            const distFromBody = this.target.computedRadius * 2
            
            if(distance <= distFromBody * 1.8) this.resetTravel()
            const tNormalized = duration / travelTime
            const dNormalized = distance / this.distanceToNext
            const landingZone = Math.max(5, this.target.computedRadius * 10) 
            const distanceDelta = this.target.coordinate.clone().sub(this.position.clone()).addScalar(distFromBody)

            let focalValue = 0
            if(this.distanceToLast <= landingZone){
                
                console.log('accelerating')
                focalValue = 36 - ( 36 / landingZone ) * this.distanceToLast
                this.position.addScaledVector(distanceDelta, easeInSine(tNormalized))

            }else if(distance <=  landingZone){
                console.log('decelearting')
                focalValue = -36 / landingZone * (distance - landingZone)
                // focalValue = 6 + ((17-6) / 3) * (this.distanceToLast - landingZone - (this.distanceToNext * 2))
                this.position.addScaledVector(distanceDelta, easeOutSine(tNormalized))
            }else{
                console.log('crusing')
                focalValue = 0.1
                this.position.addScaledVector(distanceDelta, tNormalized)
            }
            this.setFocalLength(focalValue)
            // console.log(this.getFocalLength())


            this.distanceToTarget = distance - distFromBody * 1.8
            return
        }       
        this.resetTravel()
    }
    /**
     * Reset travel animation
     */
    resetTravel(){
        STATE.inTravel = false
        this.travelStartAt = 0
        console.log('Travel over')
        this.setFocalLength(36)
    }
    /**
     * Update position of the camera through time
     * @param {Number} time THREE.clock.js elapsed time
     * @returns 
     */
    updatePosition(time){ 
        if(STATE.inTravel){
            this.travel(time)
            return
        } 
        this.position.add(this.getDelta())
    }
}
