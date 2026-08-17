import * as THREE from 'three'

export function createFadingOrbitTrailGeometry(segments, tailColor, headColor) {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array((segments + 1) * 3)
  const colors = new Float32Array((segments + 1) * 3)
  const tail = new THREE.Color(tailColor)
  const head = new THREE.Color(headColor)

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments
    tail.clone().lerp(head, progress ** 1.7).toArray(colors, index * 3)
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

export function updateFadingOrbitTrail(
  geometry,
  segments,
  currentAngle,
  arcRadians,
  radiusX,
  radiusY,
  plane = 'xz',
) {
  const positionAttribute = geometry.getAttribute('position')
  const positions = positionAttribute.array

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments
    const angle = currentAngle - arcRadians * (1 - progress)
    const offset = index * 3
    positions[offset] = Math.cos(angle) * radiusX
    if (plane === 'xy') {
      positions[offset + 1] = Math.sin(angle) * radiusY
      positions[offset + 2] = 0
    } else {
      positions[offset + 1] = 0
      positions[offset + 2] = Math.sin(angle) * radiusY
    }
  }

  positionAttribute.needsUpdate = true
}
