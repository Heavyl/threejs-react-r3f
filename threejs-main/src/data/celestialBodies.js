export const SCALE = 1 / 10000
export const ASTRONOMICAL_UNIT_KM = 149597870.7

const rawBodies = [
  { name: 'Sun', radiusKm: 695700, texture: 'sun', rotationSurfaceSpeedKmS: 1.997, phase: 0, emissive: true },
  { name: 'Mercury', radiusKm: 2439.7, texture: 'mercury', orbitAu: 0.387098, orbitalSpeedKmS: 47.362, planeTilt: 7, axialTilt: 0.035, rotationSurfaceSpeedKmS: 0.003, phase: 0.4 },
  { name: 'Venus', radiusKm: 6051.8, texture: 'venus', orbitAu: 0.723332, orbitalSpeedKmS: 35.025, planeTilt: 3.4, axialTilt: 177.3, rotationSurfaceSpeedKmS: 0.0018, phase: 1.1, atmosphere: 'venus' },
  { name: 'Earth', radiusKm: 6371, texture: 'earth', orbitAu: 1, orbitalSpeedKmS: 29.78, planeTilt: 0, axialTilt: 23.44, rotationSurfaceSpeedKmS: 0.4651, phase: 2, atmosphere: 'earth' },
  { name: 'Moon', radiusKm: 1737.4, texture: 'moon', parent: 'Earth', semiMajorAxisKm: 384400, orbitalSpeedKmS: 1.022, planeTilt: 5.145, axialTilt: 6.68, rotationSurfaceSpeedKmS: 0.004627, phase: 0.6 },
  { name: 'Mars', radiusKm: 3389.5, texture: 'mars', orbitAu: 1.523679, orbitalSpeedKmS: 24.13, planeTilt: 1.85, axialTilt: 25.19, rotationSurfaceSpeedKmS: 0.241, phase: 2.8, atmosphere: 'mars' },
  { name: 'Deimos', radiusKm: 6.2, parent: 'Mars', semiMajorAxisKm: 23463.2, orbitalSpeedKmS: 1.351, planeTilt: 1.79, rotationSurfaceSpeedKmS: 0.000357, phase: 1.8 },
  { name: 'Phobos', radiusKm: 11.267, parent: 'Mars', semiMajorAxisKm: 9376, orbitalSpeedKmS: 2.138, planeTilt: 1.08, rotationSurfaceSpeedKmS: 0.00257, phase: 3.2 },
  { name: 'Jupiter', radiusKm: 69911, texture: 'jupiter', orbitAu: 5.2044, orbitalSpeedKmS: 13.058, planeTilt: 1.304, axialTilt: 3.13, rotationSurfaceSpeedKmS: 12.6, phase: 3.7 },
  { name: 'Saturn', radiusKm: 58232, texture: 'saturn', orbitAu: 9.5826, orbitalSpeedKmS: 9.6725, planeTilt: 2.485, axialTilt: 26.73, rotationSurfaceSpeedKmS: 9.87, phase: 4.5, rings: true },
  { name: 'Uranus', radiusKm: 25362, texture: 'uranus', orbitAu: 19.2184, orbitalSpeedKmS: 6.835, planeTilt: 0.773, axialTilt: 97.77, rotationSurfaceSpeedKmS: 2.59, phase: 5.1 },
  { name: 'Neptune', radiusKm: 24622, texture: 'neptune', orbitAu: 30.11, orbitalSpeedKmS: 5.43, planeTilt: 1.77, axialTilt: 28.32, rotationSurfaceSpeedKmS: 2.68, phase: 5.8 },
]

export const CELESTIAL_BODIES = Object.freeze(rawBodies.map((body) => {
  const semiMajorAxisKm = body.semiMajorAxisKm ?? (body.orbitAu ? body.orbitAu * ASTRONOMICAL_UNIT_KM : 0)

  return Object.freeze({
    ...body,
    semiMajorAxisKm,
    renderRadius: body.radiusKm * SCALE,
    orbitRadius: semiMajorAxisKm * SCALE,
    orbitalAngularSpeed: semiMajorAxisKm > 0 ? body.orbitalSpeedKmS / semiMajorAxisKm : 0,
    rotationAngularSpeed: body.rotationSurfaceSpeedKmS
      ? body.rotationSurfaceSpeedKmS / body.radiusKm
      : 0,
  })
}))

export const ORBITING_BODIES = Object.freeze(CELESTIAL_BODIES.filter((body) => body.orbitRadius > 0))
export const BODY_BY_NAME = new Map(CELESTIAL_BODIES.map((body) => [body.name, body]))

export const TEXTURE_PATHS = Object.freeze({
  stars: '/textures/8k_stars_milky_way.jpg',
  sun: '/textures/sun/sunColor.jpg',
  mercury: '/textures/mercury/mercuryColor.jpg',
  venus: '/textures/venus/venusColor.jpg',
  venusClouds: '/textures/venus/venusClouds.jpg',
  earth: '/textures/earth/earthColor.jpg',
  earthClouds: '/textures/earth/earthClouds2.jpg',
  earthNormal: '/textures/earth/earthNormal2.jpg',
  moon: '/textures/moon/moonColor.jpg',
  mars: '/textures/mars/marsColor.jpg',
  jupiter: '/textures/jupiter/jupiterColor.jpg',
  saturn: '/textures/saturn/saturnColor.jpg',
  saturnRings: '/textures/saturn/saturnRings.png',
  uranus: '/textures/uranus/uranusColor.jpg',
  neptune: '/textures/neptune/neptuneColor.jpg',
})

export const COLOR_TEXTURE_KEYS = Object.freeze([
  'stars', 'sun', 'mercury', 'venus', 'venusClouds', 'earth', 'moon',
  'mars', 'jupiter', 'saturn', 'saturnRings', 'uranus', 'neptune',
])