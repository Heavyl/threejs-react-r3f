export const SCALE = 1 / 10000
export const ASTRONOMICAL_UNIT_KM = 149597870.7
const ASSET_BASE_URL = import.meta.env.BASE_URL

const ORBIT_COLORS = Object.freeze({
  Mercury: '#ff3b30',
  Venus: '#ff9f0a',
  Earth: '#2f80ff',
  Moon: '#8ecbff',
  Mars: '#ffd60a',
  Deimos: '#ffd180',
  Phobos: '#ffab67',
  Jupiter: '#34c759',
  Saturn: '#32ade6',
  Uranus: '#5856d6',
  Neptune: '#af52de',
  Pluto: '#e946ef',
})

const rawBodies = [
  { name: 'Sun', radiusKm: 695700, texture: 'sun', rotationPeriodHours: 609.12, phase: 0, emissive: true },
  { name: 'Mercury', radiusKm: 2439.7, texture: 'mercury', orbitAu: 0.387098, orbitalPeriodDays: 87.9691, eccentricity: 0.20563593, planeTilt: 7, axialTilt: 0.035, rotationPeriodHours: 1407.6, phase: 0.4 },
  { name: 'Venus', radiusKm: 6051.8, texture: 'venus', orbitAu: 0.723332, orbitalPeriodDays: 224.701, eccentricity: 0.00677672, planeTilt: 3.4, axialTilt: 177.3, rotationPeriodHours: -5832.5, phase: 1.1, atmosphere: 'venus' },
  { name: 'Earth', radiusKm: 6371, texture: 'earth', orbitAu: 1, orbitalPeriodDays: 365.256, eccentricity: 0.01671123, planeTilt: 0, axialTilt: 23.44, rotationPeriodHours: 23.9345, phase: 2, atmosphere: 'earth' },
  { name: 'Moon', radiusKm: 1737.4, texture: 'moon', parent: 'Earth', semiMajorAxisKm: 384400, orbitalPeriodDays: 27.3217, eccentricity: 0.0549, planeTilt: 5.145, axialTilt: 6.68, rotationPeriodHours: 655.72, phase: 0.6 },
  { name: 'Mars', radiusKm: 3389.5, texture: 'mars', orbitAu: 1.523679, orbitalPeriodDays: 686.98, eccentricity: 0.0933941, planeTilt: 1.85, axialTilt: 25.19, rotationPeriodHours: 24.6229, phase: 2.8, atmosphere: 'mars' },
  { name: 'Deimos', radiusKm: 6.2, parent: 'Mars', semiMajorAxisKm: 23463.2, orbitalPeriodDays: 1.26244, eccentricity: 0.00033, planeTilt: 1.79, rotationPeriodHours: 30.2986, phase: 1.8 },
  { name: 'Phobos', radiusKm: 11.267, parent: 'Mars', semiMajorAxisKm: 9376, orbitalPeriodDays: 0.31891, eccentricity: 0.0151, planeTilt: 1.08, rotationPeriodHours: 7.65384, phase: 3.2 },
  { name: 'Jupiter', radiusKm: 69911, texture: 'jupiter', orbitAu: 5.2044, orbitalPeriodDays: 4332.59, eccentricity: 0.04838624, planeTilt: 1.304, axialTilt: 3.13, rotationPeriodHours: 9.925, phase: 3.7 },
  { name: 'Saturn', radiusKm: 58232, texture: 'saturn', orbitAu: 9.5826, orbitalPeriodDays: 10759.22, eccentricity: 0.05386179, planeTilt: 2.485, axialTilt: 26.73, rotationPeriodHours: 10.656, phase: 4.5, rings: true },
  { name: 'Uranus', radiusKm: 25362, texture: 'uranus', orbitAu: 19.2184, orbitalPeriodDays: 30688.5, eccentricity: 0.04725744, planeTilt: 0.773, axialTilt: 97.77, rotationPeriodHours: -17.24, phase: 5.1 },
  { name: 'Neptune', radiusKm: 24622, texture: 'neptune', orbitAu: 30.11, orbitalPeriodDays: 60182, eccentricity: 0.00859048, planeTilt: 1.77, axialTilt: 28.32, rotationPeriodHours: 16.11, phase: 5.8 },
]

export const CELESTIAL_BODIES = Object.freeze(rawBodies.map((body) => {
  const semiMajorAxisKm = body.semiMajorAxisKm ?? (body.orbitAu ? body.orbitAu * ASTRONOMICAL_UNIT_KM : 0)

  return Object.freeze({
    ...body,
    semiMajorAxisKm,
    renderRadius: body.radiusKm * SCALE,
    orbitRadius: semiMajorAxisKm * SCALE,
    orbitColor: ORBIT_COLORS[body.name] ?? '#ffffff',
    orbitalAngularSpeed: body.orbitalPeriodDays
      ? Math.PI * 2 / (body.orbitalPeriodDays * 86400)
      : 0,
    rotationAngularSpeed: body.rotationPeriodHours
      ? Math.PI * 2 / (body.rotationPeriodHours * 3600)
      : 0,
  })
}))

export const ORBITING_BODIES = Object.freeze(CELESTIAL_BODIES.filter((body) => body.orbitRadius > 0))
export const BODY_BY_NAME = new Map(CELESTIAL_BODIES.map((body) => [body.name, body]))

export const SKYBOX_BASE_PATH = ASSET_BASE_URL + 'textures/sky/'
export const SKYBOX_FACE_FILES = Object.freeze([
  // Three.js swaps the X axis when adapting cubemaps to its right-handed world.
  'nx.jpg', 'px.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg',
])

export const TEXTURE_PATHS = Object.freeze({
  sun: `${ASSET_BASE_URL}textures/sun/sunColor.jpg`,
  mercury: `${ASSET_BASE_URL}textures/mercury/mercuryColor.jpg`,
  venus: `${ASSET_BASE_URL}textures/venus/venusColor.jpg`,
  venusClouds: `${ASSET_BASE_URL}textures/venus/venusClouds.jpg`,
  earth: `${ASSET_BASE_URL}textures/earth/earthColor.jpg`,
  earthClouds: `${ASSET_BASE_URL}textures/earth/earthClouds2.jpg`,
  earthNormal: `${ASSET_BASE_URL}textures/earth/earthNormal2.jpg`,
  moon: `${ASSET_BASE_URL}textures/moon/moonColor.jpg`,
  mars: `${ASSET_BASE_URL}textures/mars/marsColor.jpg`,
  jupiter: `${ASSET_BASE_URL}textures/jupiter/jupiterColor.jpg`,
  saturn: `${ASSET_BASE_URL}textures/saturn/saturnColor.jpg`,
  saturnRings: `${ASSET_BASE_URL}textures/saturn/saturnRings.png`,
  uranus: `${ASSET_BASE_URL}textures/uranus/uranusColor.jpg`,
  neptune: `${ASSET_BASE_URL}textures/neptune/neptuneColor.jpg`,
})

export const MOBILE_TEXTURE_PATHS = Object.freeze({
  ...TEXTURE_PATHS,
  earth: `${ASSET_BASE_URL}textures/earth/earthColor.jpg`,
  moon: `${ASSET_BASE_URL}textures/moon/moonColor.jpg`,
})

export const COLOR_TEXTURE_KEYS = Object.freeze([
  'sun', 'mercury', 'venus', 'venusClouds', 'earth', 'moon',
  'mars', 'jupiter', 'saturn', 'saturnRings', 'uranus', 'neptune',
])

