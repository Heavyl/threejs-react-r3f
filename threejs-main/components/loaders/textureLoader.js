import { LoadingManager, TextureLoader } from "three"


//----------- Loading Manager -----------

const loadingManager = new LoadingManager()
loadingManager.onStart = ()=>{
  console.log('start')
}
loadingManager.onLoad = ()=>{
  console.log('load')
}
loadingManager.onProgress = ()=>{
  console.log('Loading...')
}
loadingManager.onError = ()=>{
  console.log('Error !')
}


//------------ Texture Loader -------------

// const textureLoader = new THREE.TextureLoader(loadingManager)
const textureLoader = new TextureLoader()

export {textureLoader}

