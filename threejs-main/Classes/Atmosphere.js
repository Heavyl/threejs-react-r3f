import * as THREE from 'three'
import { globalMeshResolution } from '../globalParameters'
import { scale } from '../globalParameters'

/**
 * Classe for atmopsphere object
 * @param {Number} bodyRadius Radius of the body the atmosphere is attached to, herites value from CelestialBody Object
 * @param {Number} thickness Thickness of the atmosphere ( in kilometers )
 */
export default class Atmosphere{
    constructor( bodyRadius, 
      thickness = 100, 
      material = new THREE.MeshStandardMaterial({
          color : 'white',
          transparent: true,
          opacity: 0.2
        })
    ){
      this.bodyRadius = bodyRadius 
      this.thickness = thickness
      this.resolution = globalMeshResolution
      this.layers = new THREE.Group()
      this.layers.name ='Atmosphere'
      
      this.material = material
    }
  
    /**
     * Add layers of atmospheres, for obvious easthetic purpose
     * @param {Number} number Number of layers 
     * @param {number} thickness By default uses the atmosphere thickness
     * @param {THREE.Material | Array} materials Can be a material or an array of materials for each layer (propagating from inner to outer layer)
     */
    addLayer(number = 1 , material = this.material, thickness = this.thickness){
      let layerThickness = thickness
      if(thickness == this.thickness){
        layerThickness = thickness / number
      }
  
      for(let i = 0; i < number; i++){
        const layer = new THREE.Mesh(
          new THREE.SphereGeometry(
            (this.bodyRadius * scale) + (layerThickness * scale) * ( i + 1) , 
            this.resolution, 
            this.resolution),
          this.layersMaterials(material, i)
        ) 
        
        layer.name = 'Layer ' + (i + 1)
        this.layers.add(layer)    
      }
    }/**
     * Logic between atmospheric material distribution. 
     * @param {THREE.Material | Array} material Material or Array of material
     * @param {Number} index Index of the materials array, if there's one
     * @returns a THREE.Material object, either from material[index] or from solo object
     */
    layersMaterials(material, index){
      if(Array.isArray(material)){     
        if (index >= material.length ){
          
          return material[material.length -1] 
        }
        return material[index]
      }
      return material
    }
  }