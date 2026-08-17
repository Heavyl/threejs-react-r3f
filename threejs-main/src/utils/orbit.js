import * as THREE from 'three'
const ORBIT_TILT_AXIS = new THREE.Vector3(0, 0, 1)
const ORBIT_PATH_SEGMENTS = 4096
export const ORBIT_TRAIL_ARC_RADIANS = Math.PI * 2

function solveEccentricAnomaly(meanAnomaly, eccentricity) {
  let eccentricAnomaly = meanAnomaly
  for (let iteration = 0; iteration < 6; iteration += 1) {
    eccentricAnomaly -= (
      eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly
    ) / (1 - eccentricity * Math.cos(eccentricAnomaly))
  }
  return eccentricAnomaly
}

export function setOrbitalPosition(target, body, elapsedTime, parentPosition) {
  if (!body.orbitRadius) return target.set(0, 0, 0)

  const meanAnomaly = body.phase + elapsedTime * body.orbitalAngularSpeed
  const eccentricity = body.eccentricity ?? 0
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity)

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

export function updateOrbitTrailGeometry(
  geometry,
  body,
  elapsedTime,
  arcRadians = ORBIT_TRAIL_ARC_RADIANS,
) {
  const positions = geometry.getAttribute('position').array
  const segments = geometry.getAttribute('position').count - 1
  const eccentricity = body.eccentricity ?? 0
  const semiMinorAxis = body.orbitRadius * Math.sqrt(1 - eccentricity * eccentricity)
  const currentMeanAnomaly = body.phase + elapsedTime * body.orbitalAngularSpeed

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments
    const meanAnomaly = currentMeanAnomaly - arcRadians * (1 - progress)
    const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity)
    const offset = index * 3
    positions[offset] = (Math.cos(eccentricAnomaly) - eccentricity) * body.orbitRadius
    positions[offset + 1] = 0
    positions[offset + 2] = Math.sin(eccentricAnomaly) * semiMinorAxis
  }

  geometry.getAttribute('position').needsUpdate = true
}

export function createOrbitGeometry(
  body,
  segments = ORBIT_PATH_SEGMENTS,
  arcRadians = ORBIT_TRAIL_ARC_RADIANS,
) {
  const positions = new Float32Array((segments + 1) * 3)
  const alphas = new Float32Array(segments + 1)

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments
    alphas[index] = THREE.MathUtils.smoothstep(progress, 0, 0.62) ** 1.35
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('trailAlpha', new THREE.BufferAttribute(alphas, 1))
  updateOrbitTrailGeometry(geometry, body, 0, arcRadians)
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
