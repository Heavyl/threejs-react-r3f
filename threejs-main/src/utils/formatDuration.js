const SECOND = 1
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

const UNIT_LABELS = Object.freeze({
  en: {
    day: ['day', 'days'],
    week: ['week', 'weeks'],
    month: ['month', 'months'],
    year: ['year', 'years'],
  },
  fr: {
    day: ['jour', 'jours'],
    week: ['semaine', 'semaines'],
    month: ['mois', 'mois'],
    year: ['an', 'ans'],
  },
})

function formatUnit(value, unit, language) {
  const labels = UNIT_LABELS[language] ?? UNIT_LABELS.en
  return `${value} ${labels[unit][value === 1 ? 0 : 1]}`
}

function joinParts(primary, secondary) {
  return secondary ? `${primary} ${secondary}` : primary
}

export function formatDuration(durationSeconds, language = 'en') {
  if (!Number.isFinite(durationSeconds)) return '—'

  const totalSeconds = Math.max(0, Math.ceil(durationSeconds))
  if (totalSeconds < MINUTE) return `${totalSeconds} s`

  if (totalSeconds < HOUR) {
    const minutes = Math.floor(totalSeconds / MINUTE)
    const seconds = totalSeconds % MINUTE
    return `${minutes} min ${seconds.toString().padStart(2, '0')} s`
  }

  if (totalSeconds < DAY) {
    const hours = Math.floor(totalSeconds / HOUR)
    const minutes = Math.floor((totalSeconds % HOUR) / MINUTE)
    return joinParts(`${hours} h`, minutes > 0 ? `${minutes} min` : '')
  }

  if (totalSeconds < WEEK) {
    const days = Math.floor(totalSeconds / DAY)
    const hours = Math.floor((totalSeconds % DAY) / HOUR)
    return joinParts(formatUnit(days, 'day', language), hours > 0 ? `${hours} h` : '')
  }

  if (totalSeconds < MONTH) {
    const weeks = Math.floor(totalSeconds / WEEK)
    const days = Math.floor((totalSeconds % WEEK) / DAY)
    return joinParts(
      formatUnit(weeks, 'week', language),
      days > 0 ? formatUnit(days, 'day', language) : '',
    )
  }

  if (totalSeconds < YEAR) {
    const months = Math.floor(totalSeconds / MONTH)
    const weeks = Math.floor((totalSeconds % MONTH) / WEEK)
    return joinParts(
      formatUnit(months, 'month', language),
      weeks > 0 ? formatUnit(weeks, 'week', language) : '',
    )
  }

  const years = Math.floor(totalSeconds / YEAR)
  const months = Math.floor((totalSeconds % YEAR) / MONTH)
  return joinParts(
    formatUnit(years, 'year', language),
    months > 0 ? formatUnit(months, 'month', language) : '',
  )
}

