const listeners = new Set()

let snapshot = Object.freeze({
  hasJourney: false,
  active: false,
  departureId: '',
  targetId: '',
  targetingDurationSeconds: 0.65,
  shipDockingDurationSeconds: 2.65,
  totalDistanceKm: 0,
  remainingDistanceKm: 0,
  remainingDurationSeconds: 0,
  travelSpeedKmS: 0,
  visualIntensity: 0,
  progress: 0,
})

export function publishTravelMetrics(metrics) {
  snapshot = Object.freeze({ ...snapshot, ...metrics })
  listeners.forEach((listener) => listener())
}

export function subscribeToTravelMetrics(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getTravelMetricsSnapshot() {
  return snapshot
}






