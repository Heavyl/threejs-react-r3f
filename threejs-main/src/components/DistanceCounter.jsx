import { useSyncExternalStore } from 'react'
import {
  getTravelMetricsSnapshot,
  subscribeToTravelMetrics,
} from '../data/travelMetricsStore'
import { getBodyLabel, TRANSLATIONS } from '../i18n/translations'
import { formatDuration } from '../utils/formatDuration'

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
          <dd>{formatDuration(metrics.remainingDurationSeconds, language)}</dd>
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







