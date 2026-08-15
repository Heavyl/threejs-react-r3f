const BODY_LABELS = Object.freeze({
  Sun: { en: 'Sun', fr: 'Soleil' },
  Mercury: { en: 'Mercury', fr: 'Mercure' },
  Venus: { en: 'Venus', fr: 'Vénus' },
  Earth: { en: 'Earth', fr: 'Terre' },
  Moon: { en: 'Moon', fr: 'Lune' },
  Mars: { en: 'Mars', fr: 'Mars' },
  Deimos: { en: 'Deimos', fr: 'Déimos' },
  Phobos: { en: 'Phobos', fr: 'Phobos' },
  Jupiter: { en: 'Jupiter', fr: 'Jupiter' },
  Saturn: { en: 'Saturn', fr: 'Saturne' },
  Uranus: { en: 'Uranus', fr: 'Uranus' },
  Neptune: { en: 'Neptune', fr: 'Neptune' },
})

function formatTimeScale(value, language) {
  if (value === 0) return language === 'fr' ? 'Pause' : 'Paused'
  if (value === 1) return language === 'fr' ? 'Temps réel' : 'Real time'

  if (value < 60) return `${value.toFixed(0)} s/s`
  if (value < 3600) return `${(value / 60).toFixed(value < 600 ? 1 : 0)} min/s`
  if (value < 86400) return `${(value / 3600).toFixed(value < 36000 ? 1 : 0)} h/s`

  const daysPerSecond = value / 86400
  if (daysPerSecond >= 365) {
    const yearsPerSecond = daysPerSecond / 365.25
    return `${yearsPerSecond.toFixed(1)} ${language === 'fr' ? 'an/s' : 'yr/s'}`
  }
  return `${daysPerSecond.toFixed(daysPerSecond < 10 ? 1 : 0)} ${language === 'fr' ? 'j/s' : 'd/s'}`
}

export const TRANSLATIONS = Object.freeze({
  en: {
    loading: (progress) => `Loading ${progress.toFixed(0)}%`,
    loadingEyebrow: 'Preparing your journey',
    loadingTitle: 'Solar System',
    languageAction: 'Switch to French',
    travellingTo: (name) => `Travelling to ${name}…`,
    targetHint: (name, distance, duration) => `Target: ${name} — ${distance} · estimated travel time: ${duration}`,
    targetCalculating: (name) => `Target: ${name} — calculating route…`,
    selectionHint: 'Click once to target a planet, then again to travel.',
    travelPanelOpen: 'Expand travel information',
    travelPanelClose: 'Collapse travel information',
    panel: {
      ariaLabel: 'Solar system settings',
      eyebrow: 'Simulation',
      title: 'Settings',
      open: 'Open settings',
      close: 'Collapse settings',
      soundOn: 'Enable sound',
      soundOff: 'Mute sound',
      travelOpen: 'Open travel speed',
      travelClose: 'Close travel speed',
      movement: 'Motion',
      simulationSpeed: 'Time warp',
      timeScaleValue: (value) => formatTimeScale(value, 'en'),
      travelSpeed: 'Travel speed',
      display: 'Display',
      globalScale: 'Global scale',
      labels: 'Labels',
      orbits: 'Orbits',
      orbitIntensity: 'Orbit intensity',
      atmospheres: 'Atmospheres',
      rings: 'Rings',
      light: 'Lighting',
      ambientLight: 'Ambient light',
      solarIntensity: 'Sun intensity',
      backgroundBrightness: 'Background brightness',
      reset: 'Reset settings',
    },
    counter: {
      ariaLabel: (name) => `Travel information for ${name}`,
      active: 'In transit',
      arrived: 'Arrived',
      total: 'Journey distance',
      timeRemaining: 'Time remaining',
      speed: 'Travel speed',
      remaining: 'Distance remaining',
      progress: 'Travel progress',
    },
  },
  fr: {
    loading: (progress) => `Chargement ${progress.toFixed(0)} %`,
    loadingEyebrow: 'Préparation du voyage',
    loadingTitle: 'Système solaire',
    languageAction: 'Passer en anglais',
    travellingTo: (name) => `Navigation vers ${name}…`,
    targetHint: (name, distance, duration) => `Cible : ${name} — ${distance} · trajet estimé : ${duration}`,
    targetCalculating: (name) => `Cible : ${name} — calcul du trajet…`,
    selectionHint: 'Cliquez une fois pour cibler une planète, puis une seconde fois pour voyager.',
    travelPanelOpen: 'Développer les informations de voyage',
    travelPanelClose: 'Réduire les informations de voyage',
    panel: {
      ariaLabel: 'Réglages du système solaire',
      eyebrow: 'Simulation',
      title: 'Réglages',
      open: 'Ouvrir les réglages',
      close: 'Réduire les réglages',
      soundOn: 'Activer le son',
      soundOff: 'Couper le son',
      travelOpen: 'Ouvrir la vitesse de voyage',
      travelClose: 'Fermer la vitesse de voyage',
      movement: 'Mouvement',
      simulationSpeed: 'Accélération temporelle',
      timeScaleValue: (value) => formatTimeScale(value, 'fr'),
      travelSpeed: 'Vitesse de voyage',
      display: 'Affichage',
      globalScale: 'Échelle globale',
      labels: 'Libellés',
      orbits: 'Trajectoires',
      orbitIntensity: 'Intensité des trajectoires',
      atmospheres: 'Atmosphères',
      rings: 'Anneaux',
      light: 'Lumière',
      ambientLight: 'Lumière ambiante',
      solarIntensity: 'Intensité solaire',
      backgroundBrightness: 'Luminosité du fond',
      reset: 'Réinitialiser',
    },
    counter: {
      ariaLabel: (name) => `Informations du voyage vers ${name}`,
      active: 'En voyage',
      arrived: 'Arrivé',
      total: 'Distance du trajet',
      timeRemaining: 'Temps restant',
      speed: 'Vitesse de voyage',
      remaining: 'Distance restante',
      progress: 'Progression du voyage',
    },
  },
})

export function getBodyLabel(bodyName, language) {
  return BODY_LABELS[bodyName]?.[language] ?? bodyName
}










