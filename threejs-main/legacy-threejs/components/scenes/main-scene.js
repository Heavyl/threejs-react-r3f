import * as THREE from 'three'
import { cubeLoader } from '../loaders/cubeLoader'
import { camera } from '../cameras/camera'

import { solarSystemObject } from '../../data/solarSystem'
import Planet from '../../classes/Planet'
import Star from '../../classes/Star'
import CelestialBody from '../../classes/CelestialBody'



const scene = new THREE.Scene({
    name: 'Scene'
})

//-------------- Objects --------------

const systemObj = solarSystemObject
const solarSystem = new THREE.Group()
solarSystem.name = "Solar System"

for( const [name, object] of Object.entries(systemObj)){
    populate( solarSystem, object )
}

scene.add(solarSystem)


//------------ Cameras ------------- 

scene.add(camera)

//-------------- Skybox --------------

const skyTexture = cubeLoader.load([
    '/textures/sky/px.png',
    '/textures/sky/px.png',
    '/textures/sky/py.png',
    '/textures/sky/ny.png',
    '/textures/sky/pz.png',
    '/textures/sky/nz.png'
])
scene.background = skyTexture

//------------ Lights -------------

const ambientLigth = new THREE.AmbientLight(0xffffff, 0.1)
scene.add(ambientLigth)

export {scene}

/**
 * Automatically add any CelestialBody (and child classes) to the right parent. 
 * If the object have an 'orbitTarget' paremeter defined, object use this target as a parent.
 * Else it add the object to the root object. Allows to automatically add relevants satelites to it's orbit target 
 * @example 
 * @param {Planet | Star | CelestialBody} rootObject The rootObject where every others will be attached (ex : the solar system)
 * @param {Planet | Star | CelestialBody} object The object to add to the scene (planet, satelites or any other object)
 * @returns 
 */
function populate( rootObject, object){
    const parent = object.orbitTarget
    if(!parent){
        rootObject.add(object) 
        return
    }
    parent.add(object)
      
}