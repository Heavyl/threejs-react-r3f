const analysisFiles = import.meta.glob('./analysis/*.json', {
  eager: true,
  import: 'default',
})

const SUPPORTED_ANALYSIS_TYPES = new Set(['layered-body', 'information'])
const SUPPORTED_PANEL_SECTION_TYPES = new Set(['facts', 'layers', 'details'])
const DEFAULT_SECTION_COLOR = '#8ecbff'

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function hasLocalizedText(value) {
  return Boolean(
    value
    && typeof value.en === 'string'
    && typeof value.fr === 'string',
  )
}

function normalizeSection(section, type) {
  if (
    !section
    || typeof section.id !== 'string'
    || !hasLocalizedText(section.name)
    || !hasLocalizedText(section.description)
  ) return null

  if (type === 'layered-body') {
    const radiiAreValid = (
      Number.isFinite(section.innerRadiusRatio)
      && Number.isFinite(section.outerRadiusRatio)
      && section.innerRadiusRatio >= 0
      && section.outerRadiusRatio > section.innerRadiusRatio
      && section.outerRadiusRatio <= 1
    )
    const labelIsValid = (
      Array.isArray(section.labelPosition)
      && section.labelPosition.length === 3
      && section.labelPosition.every(Number.isFinite)
    )
    if (!radiiAreValid || !labelIsValid) return null
  }

  if (type === 'information') {
    const hotspotIsValid = (
      Array.isArray(section.hotspotPosition)
      && section.hotspotPosition.length === 3
      && section.hotspotPosition.every(Number.isFinite)
    )
    if (!hotspotIsValid) return null
  }

  return Object.freeze({
    ...section,
    color: typeof section.color === 'string'
      ? section.color
      : DEFAULT_SECTION_COLOR,
    range: hasLocalizedText(section.range) ? section.range : null,
  })
}

function normalizeFact(fact) {
  if (
    !fact
    || typeof fact.id !== 'string'
    || !hasLocalizedText(fact.label)
    || !hasLocalizedText(fact.value)
  ) return null

  return Object.freeze({ ...fact })
}

function normalizeSonification(sonification) {
  if (!sonification) return null

  const measurementsAreValid = (
    Number.isFinite(sonification.massEarths)
    && sonification.massEarths > 0
    && Number.isFinite(sonification.densityKgM3)
    && sonification.densityKgM3 > 0
    && Number.isFinite(sonification.rotationHours)
    && sonification.rotationHours !== 0
    && Number.isFinite(sonification.cycleDays)
    && sonification.cycleDays > 0
    && Number.isFinite(sonification.temperatureK)
    && sonification.temperatureK > 0
    && typeof sonification.source === 'string'
  )

  if (!measurementsAreValid) return null

  const densityPosition = clamp((sonification.densityKgM3 - 600) / 5000, 0, 1)
  const massPosition = Math.log10(1 + sonification.massEarths * 8)
  const rotationPosition = Math.log10(Math.abs(sonification.rotationHours) + 1)
  const cyclePosition = Math.log10(sonification.cycleDays + 1)
  const harmonics = [1, 1.25 + densityPosition * 0.25, 2, 2.5 + densityPosition * 0.5]

  return Object.freeze({
    measurements: Object.freeze({ ...sonification }),
    fundamentalHz: clamp(220 / (1 + 0.42 * massPosition), 45, 220),
    harmonics: Object.freeze(harmonics),
    pulseHz: clamp(0.42 / (1 + 0.55 * rotationPosition), 0.04, 0.4),
    driftHz: clamp(0.11 / (1 + 0.45 * cyclePosition), 0.025, 0.11),
    filterHz: clamp(350 + Math.sqrt(sonification.temperatureK) * 65, 500, 6500),
    noise: 0.035 + (1 - densityPosition) * 0.11,
    gain: clamp(0.17 + Math.log10(1 + sonification.massEarths) * 0.018, 0.17, 0.28),
  })
}

function normalizePanelSection(panelSection) {
  if (
    !panelSection
    || typeof panelSection.id !== 'string'
    || !SUPPORTED_PANEL_SECTION_TYPES.has(panelSection.type)
    || !hasLocalizedText(panelSection.title)
  ) return null

  if (panelSection.type === 'facts') {
    if (!Array.isArray(panelSection.items) || panelSection.items.length === 0) return null
    const items = panelSection.items.map(normalizeFact).filter(Boolean)
    if (items.length !== panelSection.items.length) return null
    return Object.freeze({ ...panelSection, items: Object.freeze(items) })
  }

  return Object.freeze({ ...panelSection, items: Object.freeze([]) })
}

function normalizeAnalysisTarget(rawConfig, sourcePath) {
  if (
    !rawConfig
    || typeof rawConfig.targetId !== 'string'
    || !SUPPORTED_ANALYSIS_TYPES.has(rawConfig.type)
    || !hasLocalizedText(rawConfig.title)
    || !hasLocalizedText(rawConfig.summary)
    || !Array.isArray(rawConfig.sections)
  ) {
    console.warn(`[analysis] Invalid target file ignored: ${sourcePath}`)
    return null
  }

  const sections = rawConfig.sections
    .map((section) => normalizeSection(section, rawConfig.type))
    .filter(Boolean)

  if (sections.length !== rawConfig.sections.length || sections.length === 0) {
    console.warn(`[analysis] Invalid section in target file: ${sourcePath}`)
    return null
  }

  const defaultSectionId = sections.some(({ id }) => id === rawConfig.defaultSectionId)
    ? rawConfig.defaultSectionId
    : sections[0].id
  const panelSections = Array.isArray(rawConfig.panelSections)
    ? rawConfig.panelSections.map(normalizePanelSection).filter(Boolean)
    : []
  const panelSectionIds = new Set(panelSections.map(({ id }) => id))
  const sonification = normalizeSonification(rawConfig.sonification)

  if (
    panelSections.length !== (rawConfig.panelSections?.length ?? 0)
    || panelSections.length === 0
    || panelSectionIds.size !== panelSections.length
    || (rawConfig.sonification && !sonification)
  ) {
    console.warn(`[analysis] Invalid panel section in target file: ${sourcePath}`)
    return null
  }

  return Object.freeze({
    ...rawConfig,
    id: rawConfig.targetId,
    defaultSectionId,
    sonification,
    panelSections: Object.freeze(panelSections),
    sections: Object.freeze(sections),
  })
}

const analysisTargets = Object.create(null)
Object.entries(analysisFiles).forEach(([sourcePath, rawConfig]) => {
  const config = normalizeAnalysisTarget(rawConfig, sourcePath)
  if (!config) return
  if (analysisTargets[config.id]) {
    console.warn(`[analysis] Duplicate target ignored: ${config.id} (${sourcePath})`)
    return
  }
  analysisTargets[config.id] = config
})

export const ANALYSIS_TARGETS = Object.freeze(analysisTargets)

export function getAnalysisTarget(targetId) {
  return ANALYSIS_TARGETS[targetId] ?? null
}
