import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

globalThis.FileReader ??= class FileReader {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer()
    this.onloadend?.()
  }
}

const outputDirectory = process.argv[2]
if (!outputDirectory) throw new Error('Missing output directory')

const moonConfigs = [
  {
    name: 'Phobos',
    axes: [1.22, 0.98, 0.82],
    roughness: 0.075,
    craters: [
      [[0.72, 0.22, 0.66], 0.48, 0.24],
      [[-0.42, 0.78, 0.46], 0.25, 0.1],
      [[-0.76, -0.31, 0.57], 0.2, 0.075],
      [[0.18, -0.84, -0.51], 0.16, 0.055],
    ],
  },
  {
    name: 'Deimos',
    axes: [1.18, 0.98, 0.88],
    roughness: 0.038,
    craters: [
      [[0.65, 0.55, 0.52], 0.28, 0.09],
      [[-0.72, 0.15, 0.68], 0.22, 0.065],
      [[0.22, -0.78, -0.59], 0.18, 0.045],
    ],
  },
]

function craterDisplacement(direction, craters) {
  let displacement = 0

  for (const [centerValues, radius, depth] of craters) {
    const center = new THREE.Vector3(...centerValues).normalize()
    const angle = Math.acos(THREE.MathUtils.clamp(direction.dot(center), -1, 1))
    if (angle >= radius) continue

    const normalizedDistance = angle / radius
    const bowl = -depth * (1 - normalizedDistance ** 2) ** 2
    const rim = depth * 0.2 * Math.exp(-(((normalizedDistance - 0.82) / 0.12) ** 2))
    displacement += bowl + rim
  }

  return displacement
}

function createMoon(config) {
  const geometry = new THREE.SphereGeometry(1, 128, 80)
  const positions = geometry.getAttribute('position')
  const direction = new THREE.Vector3()

  for (let index = 0; index < positions.count; index += 1) {
    direction.fromBufferAttribute(positions, index).normalize()
    const { x, y, z } = direction
    const broadShape = (
      Math.sin(x * 7.1 + y * 3.7)
      + Math.sin(y * 9.3 - z * 5.2) * 0.55
      + Math.sin(z * 13.7 + x * 4.1) * 0.28
    ) * config.roughness
    const fineShape = Math.sin((x + y - z) * 31.7) * config.roughness * 0.14
    const radius = 1 + broadShape + fineShape + craterDisplacement(direction, config.craters)

    positions.setXYZ(
      index,
      x * radius * config.axes[0],
      y * radius * config.axes[1],
      z * radius * config.axes[2],
    )
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  const material = new THREE.MeshStandardMaterial({
    name: `${config.name}Surface`,
    color: 0xffffff,
    roughness: 0.96,
    metalness: 0,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `${config.name}Model`
  return mesh
}

const exporter = new GLTFExporter()
fs.mkdirSync(outputDirectory, { recursive: true })

for (const config of moonConfigs) {
  const model = createMoon(config)
  const arrayBuffer = await new Promise((resolve, reject) => {
    exporter.parse(model, resolve, reject, {
      binary: true,
      onlyVisible: true,
      trs: false,
    })
  })
  const outputPath = path.join(outputDirectory, `${config.name.toLowerCase()}.glb`)
  fs.writeFileSync(outputPath, Buffer.from(arrayBuffer))
  process.stdout.write(`Generated ${outputPath} (${arrayBuffer.byteLength} bytes)\n`)
}
