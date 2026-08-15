import * as THREE from 'three'

const canvas = document.querySelector('#three')
let renderer = new THREE.WebGLRenderer({
  canvas :canvas, 
  antialias : true
}) 

export {renderer}