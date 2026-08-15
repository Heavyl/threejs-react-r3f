import * as THREE from 'three'
const ORBIT_TILT_AXIS = new THREE.Vector3(0, 0, 1)
const ORBIT_PATH_SEGMENTS = 4096

export function setOrbitalPosition(target, body, elapsedTime, parentPosition) {
  if (!body.orbitRadius) return target.set(0, 0, 0)

  const meanAnomaly = body.phase + elapsedTime * body.orbitalAngularSpeed
  const eccentricity = body.eccentricity ?? 0
  let eccentricAnomaly = meanAnomaly
  for (let iteration = 0; iteration < 6; iteration += 1) {
    eccentricAnomaly -= (
      eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly
    ) / (1 - eccentricity * Math.cos(eccentricAnomaly))
  }

  target.set(
    (Math.cos(eccentricAnomaly) - eccentricity) * body.orbitRadius,
    0,
    Math.sin(eccentricAnomaly)
      * body.orbitRadius
      * Math.sqrt(1 - eccentricity * eccentricity),
  )
  target.applyAxisAngle(ORBIT_TILT_AXIS, THREE.MathUtils.degToRad(body.planeTilt || 0))

  return parentPosition ? target.add(parentPosition) : target
}

export function createOrbitGeometry(body, segments = ORBIT_PATH_SEGMENTS) {
  const positions = new Float32Array((segments + 1) * 3)
  const eccentricity = body.eccentricity ?? 0
  const semiMinorAxis = body.orbitRadius * Math.sqrt(1 - eccentricity * eccentricity)

  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2
    const offset = index * 3
    positions[offset] = (Math.cos(angle) - eccentricity) * body.orbitRadius
    positions[offset + 1] = 0
    positions[offset + 2] = Math.sin(angle) * semiMinorAxis
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return geometry
}

export function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

export function dampingAlpha(strength, delta) {
  return 1 - Math.exp(-strength * delta)
}
