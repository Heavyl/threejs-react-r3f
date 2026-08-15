import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'
import { camera } from './components/cameras/camera'
import { distanceFactor, scale, timeOffset } from './globalParameters'

import { scene } from './components/scenes/main-scene'

import { renderer } from './components/renderers/mainRenderer'
import { labelRenderer } from './components/renderers/css2d'
import { solarSystemObject } from './data/solarSystem'
import { distanceCounter } from './ui/elements/distanceCounter'
import { orbitControls } from './components/controls/orbit'
import { STATE } from './data/state'
import { isTravelling } from './ui/elements/isTraveling'
import { earth, moon } from './objects/planets/earth'
import Planet from './classes/Planet'
import Satelite from './classes/Satelite'




//-------------- Init state -------------

STATE.selected = earth
STATE.focused  = earth
STATE.old  = moon 

//------------- Stats init ----------------

const stats = new Stats()
document.body.appendChild(stats.dom)

//------------------- GUI setup -------------------

// const gui = new GUI()

//------------- ThreeJS clock init ----------------

const clock = new THREE.Clock()

//------------- On Load Events ----------------

window.addEventListener('load', ()=>{
  //Start Clock
  clock.start()
  //Set canvas size on loading page
  setCanvasSize()

  //Init labels style (needs improvment)
  const labels = document.querySelectorAll('.label')  
  let labelList = []

  labels.forEach((label)=>{
    const name = label.dataset.name
    const body = scene.getObjectByName(name)
    
    //Setup event for click on labels
    label.addEventListener('pointerdown', (e)=>{
      labelList = []

      if(STATE.inTravel) return
      //On click, set selected body to target
      STATE.old = STATE.selected 
      STATE.selected  = body       


      //Case where click target is different from last clicked target :

      if(STATE.selected === STATE.old ){       
        //Happens when current body is selected (double click)   
        if(STATE.selected !== STATE.focused){
          camera.distanceToNext = camera.distanceTo(STATE.selected)
          camera.distanceToTarget = camera.distanceToNext  
          STATE.inTransition = true
          STATE.inTravel = true

        }
        STATE.focused = STATE.selected
      }
      camera.target =  STATE.focused  
      
    })
      
  })
  
  //Dom element integration
  document.body.appendChild(distanceCounter)

})

//------------- On resize Events ----------------

window.addEventListener("resize", (e)=>{
  setCanvasSize()
})

//------------ Animation Loop -----------------


function animate(){
  window.requestAnimationFrame(animate)
  
  //Set elapsed time
  const elapsedTime = clock.getElapsedTime() 
  let time = elapsedTime + timeOffset
  
  //render
  renderer.render(scene, camera)
  labelRenderer.render( scene, camera )
  
  //Get camera target coordinate before every other animation
  camera.getOldCoord()

  //Object state machine
  for( const [name, object] of Object.entries(solarSystemObject)){

    //Orbits
    if(object.isOrbiting){
      if(STATE.inTravel){
        object.play = false
      }else{
        object.play = true
        object.orbit(time)
      }
    }
    //Rotations
    if(object.isRotating){
      object.rotate(time)
    }
  }

  //Camera Animation
  camera.updatePosition(time)
  orbitControls.updatePosition(time)

  //ui state machine 
  if(STATE.inTravel){
    isTravelling.classList.add('blink')
    isTravelling.style.opacity = '1'

  }else{
    isTravelling.classList.remove('blink')
    isTravelling.style.opacity = '0'

  }
  updateElement(distanceCounter, '#counter-value', toRealDistance(camera.distanceToTarget))
  updateElement(distanceCounter, '#counter-target-name', STATE.focused?.name  )

  
  update()
}

animate()

//---------------- Functions --------------

function update(){
  stats.update()
  orbitControls.update()
}

/**
 * Set canvas size depending on the width and height of the window.
 * Function to be called on load and on resize event
 */
function setCanvasSize(){

  //Set aspect
  const aspect = {
    width : window.innerWidth,
    height : window.innerHeight
  }
  aspect.width = window.innerWidth
  aspect.height = window.innerHeight
  
  //Set aspect Ratio
  camera.aspect = aspect.width / aspect.height
  camera.updateProjectionMatrix()

  //Set rendererSize
  renderer.setSize(aspect.width, aspect.height)
  labelRenderer.setSize( aspect.width, aspect.height )
}
/**
 * Convert computed distance to real distance as a display purpose. 
 * @param {Number} computedDistance 
 * @returns a formated number as a string 
 */
function toRealDistance(computedDistance){

  if(computedDistance == 0) return

  const realDistance =  Math.max( 0, Math.floor((computedDistance/scale) * distanceFactor ) )
  if(realDistance == 0)  return ' ' // if

  const toString = realDistance.toString().length
  let number = 0
  let format = ''
 
  if(toString >= 7 & toString <= 9){
    number = formatMillion(realDistance)
    format = 'million'
  }
  else if(toString > 9){
    number = formatBillion(realDistance)
    format = 'billion'
  }else{
    number = numberWithSpaces(realDistance)
  }
  
  return number  + ' ' + format + ' Km'
}
/**
 * Format number and add spaces
 * @param {Number} x 
 * @returns 
 */
function numberWithSpaces(x) {
  var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return parts.join(".");
}
/**
 * take a distance in entry and return a truncated equivalent in million/billion
 * @param {Number} x 
 * @returns 
 */
function formatMillion(x){
    return (x / 1000000).toFixed(2) 
}
function formatBillion(x){
  return (x / 1000000000).toFixed(2) 
}
/**
 * Update html element with new content
 * @param {HTMLElement} element HTML Element to update
 * @param {String} selector if target is child of element, use .querySelector syntaxe ('div', '.class', '#id')
 * @param {String | Number} content The new content
 */
function updateElement(element, selector, content){

  if( !content ) return
  
  if(selector){
    element.querySelector(selector).textContent = content
    return
  }
  element.textContent = content
}

function hide(element){
  element.classList.add('hidden')
}
function show(element){
  element.classList.remove('hidden')

}

function isSatelite(label){
  return label.dataset.type == 'satelite'
}
//Hide every satelite
function hideCurrent(label){

}