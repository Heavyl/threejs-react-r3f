import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import { STATE } from "../data/state"


export default class Orbit extends OrbitControls{
    constructor(camera, renderer){
        super(camera, renderer )
        this.camera = camera
        this.renderer = renderer
       
        //Transition
        this.inTransition = false
        this.transValue = 1
        this.transStep = 0.01
        this.transCount = 0
    }
    changeFocus(time){
        if( this.transCount < this.transValue){      
            this.target = this.target
            .clone()
            .add(this.camera.target.coordinate.clone()
            .sub(this.target)
            .multiplyScalar(this.transCount)) 
            this.transCount += this.transStep 
            return
        }        
        this.resetTransition()
    }
    updatePosition(time){
        if(STATE.inTransition){
            this.changeFocus(time)
            return
        } 
        this.target = this.camera.target.coordinate
    }
    resetTransition(){
        this.transCount = 0 
        STATE.inTransition = false
        // console.log('Transition over')
    }

}

