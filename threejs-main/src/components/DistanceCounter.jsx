import { useSyncExternalStore } from 'react'
import {
  getTravelMetricsSnapshot,
  subscribeToTravelMetrics,
} from '../data/travelMetricsStore'
import { getBodyLabel, TRANSLATIONS } from '../i18n/translations'

function formatDistance(distanceKm, language) {
  if (!Number.isFinite(distanceKm)) return '—'

  const locale = language === 'fr' ? 'fr-FR' : 'en-US'
  const formatter = new Intl.NumberFormat(locale, {
    notation: distanceKm >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: distanceKm >= 1_000_000 ? 2 : 0,
  })
  return `${formatter.format(Math.max(0, distanceKm))} km`
}

function formatSpeed(speedKmS, language) {
  if (!Number.isFinite(speedKmS)) return '—'

  const locale = language === 'fr' ? 'fr-FR' : 'en-US'
  const formatter = new Intl.NumberFormat(locale, {
    notation: speedKmS >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: speedKmS >= 1_000_000 ? 2 : 0,
  })
  return `${formatter.format(Math.max(0, speedKmS))} km/s`
}

function formatDuration(durationSeconds) {
  if (!Number.isFinite(durationSeconds)) return '—'

  const roundedSeconds = Math.max(0, Math.ceil(durationSeconds))
  if (roundedSeconds < 60) return `${roundedSeconds} s`

  const hours = Math.floor(roundedSeconds / 3600)
  const minutes = Math.floor((roundedSeconds % 3600) / 60)
  const seconds = roundedSeconds % 60
  if (hours > 0) return `${hours} h ${minutes} min`
  return `${minutes} min ${seconds.toString().padStart(2, '0')} s`
}

export default function DistanceCounter({ language }) {
  const metrics = useSyncExternalStore(
    subscribeToTravelMetrics,
    getTravelMetricsSnapshot,
    getTravelMetricsSnapshot,
  )

  if (!metrics.hasJourney) return null

  const text = TRANSLATIONS[language].counter
  const targetLabel = getBodyLabel(metrics.targetId, language)

  return (
    <div className="distance-counter distance-counter--embedded" role="group" aria-label={text.ariaLabel(targetLabel)}>
      <dl>
        <div>
          <dt>{text.total}</dt>
          <dd>{formatDistance(metrics.totalDistanceKm, language)}</dd>
        </div>
        <div>
          <dt>{text.timeRemaining}</dt>
          <dd>{formatDuration(metrics.remainingDurationSeconds)}</dd>
        </div>
        <div>
          <dt>{text.speed}</dt>
          <dd>{formatSpeed(metrics.travelSpeedKmS, language)}</dd>
        </div>
        <div>
          <dt>{text.remaining}</dt>
          <dd>{formatDistance(metrics.remainingDistanceKm, language)}</dd>
        </div>
      </dl>

      <div
        className="distance-counter__progress"
        role="progressbar"
        aria-label={text.progress}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(metrics.progress * 100)}
      >
        <span style={{ transform: `scaleX(${metrics.progress})` }} />
      </div>
    </div>
  )
}






