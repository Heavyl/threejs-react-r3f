import * as THREE from 'three'
import { scale } from '../globalParameters'


export default class Ring{
    constructor(target, radius, innerRadius, material){
        this.target = target
        this.radius = radius
        this.innerRadius = innerRadius
        this.material = material

        const computedRadius = this.radius * scale 
        const computedInnerRadius = this.innerRadius * scale

        const ringGeom = new THREE.RingGeometry(
            computedInnerRadius,
            computedRadius, 
            250, 1, 1
         )
        const pos = ringGeom.attributes.position
        const v3 = new THREE.Vector3()
        for(let i = 0; i < pos.count; i++){
            v3.fromBufferAttribute(pos, i)            
            let angularRepeat = 3
            let lengthScale = 0.02

            let v = v3.length()  * lengthScale
            v3.normalize()
            let u = ((Math.atan2(v3.x, v3.y) + Math.PI) * angularRepeat / Math.PI) 


            ringGeom.attributes.uv.setXY(i,u,v)
        }
        
        const ring = new THREE.Mesh( ringGeom, this.material ) 
        ring.castShadow  = true
        ring.receiveShadow = true
        ring.name = this.target.name + "'s ring "
        ring.rotateX(Math.PI/2)

        return ring
        
    }

}