import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

globalThis.FileReader ??= class FileReader {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer()
    this.onloadend?.()
  }
}

const outputPath = process.argv[2]
if (!outputPath) throw new Error('Missing output .glb path')

const ship = new THREE.Group()
ship.name = 'AsterionTravelShip'

const hullMaterial = new THREE.MeshStandardMaterial({
  name: 'IvoryPaper',
  color: 0xf2e7d5,
  metalness: 0,
  roughness: 1,
  flatShading: true,
})
const darkMaterial = new THREE.MeshStandardMaterial({
  name: 'CharcoalPaper',
  color: 0x28313b,
  metalness: 0,
  roughness: 1,
  flatShading: true,
})
const canopyMaterial = new THREE.MeshStandardMaterial({
  name: 'BluePaperCanopy',
  color: 0x5c96a8,
  emissive: 0x15333c,
  emissiveIntensity: 0.35,
  metalness: 0,
  roughness: 0.92,
  flatShading: true,
})
const engineMaterial = new THREE.MeshStandardMaterial({
  name: 'BluePaperGlow',
  color: 0x8edbff,
  emissive: 0x2f9cff,
  emissiveIntensity: 2.2,
  metalness: 0,
  roughness: 0.8,
  flatShading: true,
})
const accentMaterial = new THREE.MeshStandardMaterial({
  name: 'CoralPaperAccent',
  color: 0xe86f51,
  emissive: 0x5a180d,
  emissiveIntensity: 0.35,
  metalness: 0,
  roughness: 1,
  flatShading: true,
})

const hullPoints = [
  new THREE.Vector3(0, 0, -2.55),
  new THREE.Vector3(-0.58, -0.22, -1.05),
  new THREE.Vector3(0.58, -0.22, -1.05),
  new THREE.Vector3(-0.78, -0.3, 0.65),
  new THREE.Vector3(0.78, -0.3, 0.65),
  new THREE.Vector3(-0.56, -0.2, 1.55),
  new THREE.Vector3(0.56, -0.2, 1.55),
  new THREE.Vector3(-0.48, 0.32, -0.95),
  new THREE.Vector3(0.48, 0.32, -0.95),
  new THREE.Vector3(-0.62, 0.42, 0.55),
  new THREE.Vector3(0.62, 0.42, 0.55),
  new THREE.Vector3(-0.42, 0.24, 1.55),
  new THREE.Vector3(0.42, 0.24, 1.55),
]
const hull = new THREE.Mesh(new ConvexGeometry(hullPoints), hullMaterial)
hull.name = 'MainHull'
ship.add(hull)

function createWing(side) {
  const innerX = 0.45 * side
  const outerX = 2.05 * side
  const vertices = new Float32Array([
    innerX, 0.02, -0.45,
    outerX, -0.02, 0.25,
    1.65 * side, -0.02, 1.12,
    innerX, 0.02, 0.78,
    innerX, -0.1, -0.45,
    outerX, -0.1, 0.25,
    1.65 * side, -0.1, 1.12,
    innerX, -0.1, 0.78,
  ])
  const indices = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0,
  ]
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const wing = new THREE.Mesh(geometry, hullMaterial)
  wing.name = side < 0 ? 'LeftWing' : 'RightWing'
  return wing
}
ship.add(createWing(-1), createWing(1))

const belly = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.18, 2.45), darkMaterial)
belly.name = 'BellyArmor'
belly.position.set(0, -0.31, 0.15)
ship.add(belly)

const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), canopyMaterial)
canopy.name = 'CockpitCanopy'
canopy.scale.set(0.43, 0.25, 0.78)
canopy.position.set(0, 0.4, -0.62)
ship.add(canopy)

for (const side of [-1, 1]) {
  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.32, 1.15, 16), darkMaterial)
  engine.name = side < 0 ? 'LeftEngine' : 'RightEngine'
  engine.rotation.x = Math.PI / 2
  engine.position.set(0.53 * side, 0, 1.18)
  ship.add(engine)

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.08, 16), engineMaterial)
  exhaust.name = side < 0 ? 'LeftEngineGlow' : 'RightEngineGlow'
  exhaust.rotation.x = Math.PI / 2
  exhaust.position.set(0.53 * side, 0, 1.79)
  ship.add(exhaust)

  const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), accentMaterial)
  navLight.name = side < 0 ? 'LeftNavigationLight' : 'RightNavigationLight'
  navLight.position.set(1.72 * side, 0.02, 0.4)
  ship.add(navLight)
}

const dorsalFin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.58, 0.82), darkMaterial)
dorsalFin.name = 'DorsalFin'
dorsalFin.position.set(0, 0.47, 0.85)
dorsalFin.rotation.x = -0.18
ship.add(dorsalFin)

const centerAccent = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 2.1), accentMaterial)
centerAccent.name = 'CenterAccent'
centerAccent.position.set(0, 0.435, 0.2)
ship.add(centerAccent)

ship.rotation.set(0, 0, 0)
ship.traverse((object) => {
  if (object.isMesh) {
    object.castShadow = true
    object.receiveShadow = true
  }
})

const exporter = new GLTFExporter()
const arrayBuffer = await new Promise((resolve, reject) => {
  exporter.parse(ship, resolve, reject, {
    binary: true,
    onlyVisible: true,
    trs: false,
  })
})

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, Buffer.from(arrayBuffer))
process.stdout.write(`Generated ${outputPath} (${arrayBuffer.byteLength} bytes)\n`)
