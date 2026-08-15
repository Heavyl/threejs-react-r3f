import { useCallback, useEffect, useRef } from 'react'

const MASTER_VOLUME = 0.42
const AMBIENT_FREQUENCIES = [55, 82.41, 110, 164.81]

function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1
  }
  return buffer
}

function createAudioGraph() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null

  const context = new AudioContext()
  const masterGain = context.createGain()
  masterGain.gain.value = 0
  masterGain.connect(context.destination)

  const ambientGain = context.createGain()
  ambientGain.gain.value = 0.58
  const ambientFilter = context.createBiquadFilter()
  ambientFilter.type = 'lowpass'
  ambientFilter.frequency.value = 620
  ambientFilter.Q.value = 0.7
  ambientFilter.connect(ambientGain)
  ambientGain.connect(masterGain)

  AMBIENT_FREQUENCIES.forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const oscillatorGain = context.createGain()
    oscillator.type = index % 2 === 0 ? 'sine' : 'triangle'
    oscillator.frequency.value = frequency
    oscillator.detune.value = index % 2 === 0 ? -4 : 4
    oscillatorGain.gain.value = index < 2 ? 0.035 : 0.018
    oscillator.connect(oscillatorGain)
    oscillatorGain.connect(ambientFilter)
    oscillator.start()
  })

  const ambientLfo = context.createOscillator()
  const ambientLfoGain = context.createGain()
  ambientLfo.frequency.value = 0.07
  ambientLfoGain.gain.value = 0.12
  ambientLfo.connect(ambientLfoGain)
  ambientLfoGain.connect(ambientGain.gain)
  ambientLfo.start()

  const travelGain = context.createGain()
  travelGain.gain.value = 0
  travelGain.connect(masterGain)

  const noiseSource = context.createBufferSource()
  const noiseFilter = context.createBiquadFilter()
  const noiseGain = context.createGain()
  noiseSource.buffer = createNoiseBuffer(context)
  noiseSource.loop = true
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = 420
  noiseFilter.Q.value = 0.55
  noiseGain.gain.value = 0.16
  noiseSource.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(travelGain)
  noiseSource.start()

  const engineOscillator = context.createOscillator()
  const engineFilter = context.createBiquadFilter()
  const engineGain = context.createGain()
  engineOscillator.type = 'sawtooth'
  engineOscillator.frequency.value = 48
  engineFilter.type = 'lowpass'
  engineFilter.frequency.value = 135
  engineGain.gain.value = 0.055
  engineOscillator.connect(engineFilter)
  engineFilter.connect(engineGain)
  engineGain.connect(travelGain)
  engineOscillator.start()

  return { context, masterGain, travelGain }
}

export function useSolarAudio({ enabled, travelling }) {
  const graphRef = useRef(null)
  const enabledRef = useRef(enabled)
  const travellingRef = useRef(travelling)
  enabledRef.current = enabled
  travellingRef.current = travelling

  const ensureAudio = useCallback(() => {
    if (!graphRef.current) graphRef.current = createAudioGraph()
    const graph = graphRef.current
    if (!graph) return

    graph.context.resume().catch(() => {})
    const now = graph.context.currentTime
    graph.masterGain.gain.cancelScheduledValues(now)
    graph.masterGain.gain.setTargetAtTime(enabledRef.current ? MASTER_VOLUME : 0, now, 0.08)
    graph.travelGain.gain.cancelScheduledValues(now)
    graph.travelGain.gain.setTargetAtTime(travellingRef.current ? 1 : 0, now, travellingRef.current ? 0.65 : 0.9)
  }, [])

  useEffect(() => {
    const unlock = () => {
      if (enabledRef.current) ensureAudio()
    }
    window.addEventListener('pointerdown', unlock, { capture: true, once: true })
    window.addEventListener('keydown', unlock, { capture: true, once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
    }
  }, [ensureAudio])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    const now = graph.context.currentTime
    graph.masterGain.gain.cancelScheduledValues(now)
    graph.masterGain.gain.setTargetAtTime(enabled ? MASTER_VOLUME : 0, now, 0.08)
  }, [enabled])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    const now = graph.context.currentTime
    graph.travelGain.gain.cancelScheduledValues(now)
    graph.travelGain.gain.setTargetAtTime(travelling ? 1 : 0, now, travelling ? 0.65 : 0.9)
  }, [travelling])

  useEffect(() => () => {
    graphRef.current?.context.close().catch(() => {})
    graphRef.current = null
  }, [])

  return ensureAudio
}
