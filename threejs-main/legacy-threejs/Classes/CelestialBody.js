import * as THREE from 'three'
import { globalSpeed, scale, distanceFactor, globalMeshResolution } from '../globalParameters'
import OrbitPath from './OrbitPath'
import Label from './Label'
  
/**
 * CELESTIAL BODY
 * @param {Number} radius The radius of the celestial body ( in kilometers )
 * @param {THREE.Object3D} orbitTarget The THREE.Object3D target to orbit around
 * @param {Number} axialTilt The axial tilt of the body ( in degrees )
 * @param {THREE.Material} material The material Object for the body
 */
export default class CelestialBody extends THREE.Group{
    constructor(radius = 1000, orbitTarget = null, material = new THREE.MeshStandardMaterial()){
      super()
      this.name = 'Celestial Body'

      //Graphic parameters :
      this.resolution = globalMeshResolution
      this.orbitPathColor
      this.orbitPathRes
  
      //Basic init values
      this.radius = radius // in km
      this.revolutionSpeed = 1 // in km/s
      this.isRotating = false
      this.coordinate = new THREE.Vector3()
      this.isOrbiting = false
      this.orbitDirection = 'counterclockwise'
      this.animationSpeed = globalSpeed
      
      //Materials
      this.material = material
      
      //Orbit
      this.orbitingSpeed = 0 // in km/s
      this.distanceFromTarget = 0

      //Axial and planeTilt
      this.axialTilt = 0
      this.planeTilt = 0

      //Group core
      this.body = new THREE.Group()   
      
      //Animation
      this.play = true
    } 
    build(){
      //Create Pivot point (to manage planar shifting)
      this.pivotPoint = new THREE.Group()
      this.pivotPoint.name ='Pivot Point'
      
      //Set Computed values, to limit scaling abération
      this.computedRadius = this.radius * scale
      this.computedSpeed = (scale * this.orbitingSpeed ) / distanceFactor 
      this.computedRevSpeed = scale * this.revolutionSpeed 
      this.computedDistFromCam = this.computedRadius * 2
      
      if(this.orbitTarget){
        
        //Set orbit Target
        this.orbitTarget = this.orbitTarget
        this.orbitTargetBody = this.orbitTarget.body

        //Compute distance from target
        this.computedDistance = ((this.orbitTarget.radius + this.distanceFromTarget / distanceFactor) * scale  ) 

        //Set orbit path
        this.orbitPath = this.createOrbitPath( this.orbitPathColor ? this.orbitPathColor : 0xffffff)
        this.pivotPoint.attach(this.orbitPath)
        this.pivotPoint.rotateZ(this.planeTilt)
        
      }

      //Axes Helper
      const axeHelper = new THREE.AxesHelper(this.computedRadius + 10 * this.computedRadius)
      axeHelper.name = 'Axes'
      this.add(axeHelper)

      //Build Surface geometry
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry( this.computedRadius, this.resolution, this.resolution ), 
        this.material) 
      mesh.name = 'Surface'
      mesh.receiveShadow = true
      mesh.castShadow = true
      
      //Body group to add mesh to (surface, atmosphere)
      this.body.add(mesh)
      this.body.name = 'Body' 
      if(this.computedDistance){
        this.pivotPoint.position.z = this.computedDistance
      }
      
      //add object to pivot, add pivot to parent
      this.pivotPoint.attach(this.body)
      this.attach(this.pivotPoint)
      this.body.rotateZ(this.axialTilt)
      
      //Labels and pointer
      const label = new Label(this)
      const labels = new THREE.Group()
      labels.name = 'labels'
      labels.add(label)
      this.body.add(labels)

      this.cameraDistance
    }
    /**
     * Manage body rotation on itself. Update position of body.
     * @param {Boolean} clockwise Revolution direction. True if clockwise, false if counterclockwise
     */
    rotate(time, clockwise = false){
      let revolutionDirection = 1
      if(clockwise){
        revolutionDirection = -1
      }
      // this.body.rotateY(this.computedRevSpeed * revolutionDirection)
      // this.body.rotation.y = this.computedRevSpeed * time * revolutionDirection
      this.body.rotateY((this.computedRevSpeed* this.animationSpeed  * revolutionDirection)/10)
    }
    /**
     * Manage the orbit animation, update position of body
     * @param {THREE.Clock} time Time from THREE.clock
     * @param {Boolean} clockwise Orbit direction. True if clockwise, false if counterclockwise
     */
    orbit(time){
      const target = this.orbitTarget
      const targetPosition = new THREE.Vector3()
      target.body.getWorldPosition(targetPosition)
      this.pivotPoint.position.set(targetPosition.x,targetPosition.y, targetPosition.z)
      
      //Orbit direction
      let direction = -1
      if(this.orbitDirection === 'counterclockwise') {
        direction = -1
      }else if(this.orbitDirection === 'clockwise'){
        direction = 1
      }
      
      
      this.play 
        ? this.animationSpeed = globalSpeed 
        : this.animationSpeed = 0
      
      //Orbit mathematics      
      this.body.position.x = target.position.x + ( Math.cos(this.computedSpeed * this.animationSpeed * time) * (this.computedDistance * direction))
      this.body.position.z = target.position.z + ( Math.sin(this.computedSpeed * this.animationSpeed * time) * this.computedDistance)
      
      this.body.getWorldPosition(this.coordinate)
      
    }
    /**
     * 
     * @param {THREE.Color} color A THREE.Color object
     * @param {Number} angle Angle of planar tilt (in degree)
     * @returns An orbit path to render in physical world
     */
    createOrbitPath(color){  
      return new OrbitPath(this, color)          
    }
    computeSpeed(){
      return scale * this.orbitingSpeed * this.animationSpeed  / distanceFactor 
    }
  }