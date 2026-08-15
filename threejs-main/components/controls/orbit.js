import Orbit from "../../classes/Controls"
import { camera } from '../cameras/camera'
import { labelRenderer } from '../renderers/css2d'


//--------------OrbitControl-------------

const orbitControls = new Orbit(camera,labelRenderer.domElement)
orbitControls.enableDamping = true
orbitControls.dampingFactor = 0.02
orbitControls.target = camera.target.coordinate

orbitControls.enablePan = false

export {orbitControls}