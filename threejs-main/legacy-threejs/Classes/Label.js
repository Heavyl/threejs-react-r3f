import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'


export default class Label{
    constructor (target){

        this.target = target
        const div = document.createElement( 'div' )
        div.className = 'label'
        div.id = `${this.target.name.toLowerCase()}-label`

        div.dataset.name = this.target.name
        div.dataset.type = this.target.constructor.name.toLowerCase()
        
        div.textContent = `𐤏 ${this.target.name}`
        div.style.backgroundColor = 'transparent'

        
        // div.addEventListener('pointerdown', (e)=>{
            
        // })        
        
        const css2 = new CSS2DObject( div )

        css2.center.set(0, 0)
        css2.position.set(0, 0, 0)
        css2.layers.set(0)

        return css2
    }
}