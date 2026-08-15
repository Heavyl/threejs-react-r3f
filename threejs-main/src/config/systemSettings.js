export const SPEED_OF_LIGHT_KM_S = 299792.458
export const BASE_TRAVEL_SPEED_KM_S = 687000 / 3600

const createTravelSpeedPreset = (id, speedKmS, en, fr = en) => Object.freeze({
  id,
  speedKmS,
  label: Object.freeze({ en, fr }),
})

export const TRAVEL_SPEED_PRESETS = Object.freeze([
  createTravelSpeedPreset('apollo-10', 11.08, 'Apollo 10'),
  createTravelSpeedPreset('new-horizons', 16.26, 'New Horizons'),
  createTravelSpeedPreset('voyager-1', 17, 'Voyager 1'),
  createTravelSpeedPreset('helios-2', 70.22, 'Helios 2'),
  createTravelSpeedPreset('parker', BASE_TRAVEL_SPEED_KM_S, 'Parker Solar Probe'),
  createTravelSpeedPreset('light-0.1', SPEED_OF_LIGHT_KM_S * 0.001, '0.1% light speed', '0,1 % de la lumière'),
  createTravelSpeedPreset('light-1', SPEED_OF_LIGHT_KM_S * 0.01, '1% light speed', '1 % de la lumière'),
  createTravelSpeedPreset('light-10', SPEED_OF_LIGHT_KM_S * 0.1, '10% light speed', '10 % de la lumière'),
  createTravelSpeedPreset('light-50', SPEED_OF_LIGHT_KM_S * 0.5, '50% light speed', '50 % de la lumière'),
  createTravelSpeedPreset('light-100', SPEED_OF_LIGHT_KM_S, 'Speed of light', 'Vitesse de la lumière'),
])

export const MIN_TRAVEL_SPEED_KM_S = TRAVEL_SPEED_PRESETS[0].speedKmS
export const MAX_TRAVEL_SPEED_KM_S = TRAVEL_SPEED_PRESETS.at(-1).speedKmS

export const DEFAULT_SYSTEM_SETTINGS = Object.freeze({
  timeScale: 600,
  travelSpeedKmS: BASE_TRAVEL_SPEED_KM_S,
  globalScale: 1,
  showOrbits: true,
  orbitOpacity: 0.12,
  showLabels: true,
  showAtmospheres: true,
  showRings: true,
  ambientIntensity: 0.08,
  sunLightIntensity: 3,
  backgroundIntensity: 1,
})


