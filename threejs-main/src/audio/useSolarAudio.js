import { useCallback, useEffect, useRef } from 'react'
import melodyScore from '../data/sonificationMelody.json'

const MASTER_VOLUME = 0.42
const AMBIENT_FREQUENCIES = [55, 82.41, 110, 164.81]
// Web Audio requires AudioBuffer sample rates in the audio range. A low valid
// rate keeps this control signal lightweight while retaining smooth glides.
const MELODY_CONTROL_SAMPLE_RATE = 8000

function getStepDetuneCents(step, fundamentalHz) {
  if (Number.isFinite(step.semitones)) return step.semitones * 100
  if (Number.isFinite(step.frequencyRatio) && step.frequencyRatio > 0) {
    return 1200 * Math.log2(step.frequencyRatio)
  }
  if (Number.isFinite(step.frequencyHz) && step.frequencyHz > 0) {
    return 1200 * Math.log2(step.frequencyHz / fundamentalHz)
  }
  return 0
}

function createMelodyModulator(context, fundamentalHz, oscillators) {
  if (!melodyScore.enabled || !Array.isArray(melodyScore.steps)) return null

  const steps = melodyScore.steps.filter((step) => (
    Number.isFinite(step.durationSeconds)
    && step.durationSeconds > 0
    && (
      Number.isFinite(step.semitones)
      || (Number.isFinite(step.frequencyRatio) && step.frequencyRatio > 0)
      || (Number.isFinite(step.frequencyHz) && step.frequencyHz > 0)
    )
  ))
  if (steps.length === 0) return null

  const durationSeconds = steps.reduce((total, step) => total + step.durationSeconds, 0)
  const frameCount = Math.max(1, Math.ceil(durationSeconds * MELODY_CONTROL_SAMPLE_RATE))
  const buffer = context.createBuffer(1, frameCount, MELODY_CONTROL_SAMPLE_RATE)
  const samples = buffer.getChannelData(0)
  let frameOffset = 0

  steps.forEach((step, index) => {
    const stepFrames = Math.max(1, Math.round(step.durationSeconds * MELODY_CONTROL_SAMPLE_RATE))
    const transitionFrames = Math.min(
      stepFrames,
      Math.max(0, Math.round((step.transitionSeconds ?? 0) * MELODY_CONTROL_SAMPLE_RATE)),
    )
    const previousIndex = index === 0 ? steps.length - 1 : index - 1
    const previousCents = getStepDetuneCents(steps[previousIndex], fundamentalHz)
    const targetCents = getStepDetuneCents(step, fundamentalHz)

    for (let localFrame = 0; localFrame < stepFrames && frameOffset < frameCount; localFrame += 1) {
      const transitionProgress = transitionFrames > 1
        ? Math.min(1, localFrame / (transitionFrames - 1))
        : 1
      const easedProgress = transitionProgress * transitionProgress * (3 - 2 * transitionProgress)
      samples[frameOffset] = previousCents + (targetCents - previousCents) * easedProgress
      frameOffset += 1
    }
  })

  while (frameOffset < frameCount) {
    samples[frameOffset] = samples[Math.max(0, frameOffset - 1)]
    frameOffset += 1
  }

  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = melodyScore.loop !== false
  oscillators.forEach((oscillator) => source.connect(oscillator.detune))
  source.start()
  return source
}

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

  const analysisAnalyser = context.createAnalyser()
  analysisAnalyser.fftSize = 1024
  analysisAnalyser.smoothingTimeConstant = 0.82
  analysisAnalyser.minDecibels = -92
  analysisAnalyser.maxDecibels = -24
  analysisAnalyser.connect(masterGain)

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

  return {
    context,
    masterGain,
    ambientGain,
    travelGain,
    analysisAnalyser,
    analysisVoice: null,
  }
}

function stopSonificationVoice(graph, fadeSeconds = 1.4) {
  const voice = graph.analysisVoice
  if (!voice) return

  const now = graph.context.currentTime
  voice.outputGain.gain.cancelScheduledValues(now)
  voice.outputGain.gain.setTargetAtTime(0, now, Math.max(0.05, fadeSeconds / 4))
  voice.sources.forEach((source) => {
    try {
      source.stop(now + fadeSeconds)
    } catch {
      // The source may already have been stopped by a rapid target change.
    }
  })
  graph.analysisVoice = null
}

function startSonificationVoice(graph, sonification) {
  stopSonificationVoice(graph)

  const { context, analysisAnalyser } = graph
  const now = context.currentTime
  const outputGain = context.createGain()
  const toneGain = context.createGain()
  const toneFilter = context.createBiquadFilter()
  const sources = []
  const toneOscillators = []

  outputGain.gain.value = 0
  outputGain.connect(analysisAnalyser)
  toneGain.gain.value = 0.72
  toneGain.connect(outputGain)
  toneFilter.type = 'lowpass'
  toneFilter.frequency.value = sonification.filterHz
  toneFilter.Q.value = 1.1
  toneFilter.connect(toneGain)

  sonification.harmonics.forEach((ratio, index) => {
    const oscillator = context.createOscillator()
    const oscillatorGain = context.createGain()
    oscillator.type = index === 0 ? 'sine' : index % 2 === 0 ? 'triangle' : 'sine'
    oscillator.frequency.value = sonification.fundamentalHz * ratio
    oscillator.detune.value = index % 2 === 0 ? -3 : 3
    oscillatorGain.gain.value = 0.16 / (1 + index * 0.72)
    oscillator.connect(oscillatorGain)
    oscillatorGain.connect(toneFilter)
    oscillator.start()
    sources.push(oscillator)
    toneOscillators.push(oscillator)
  })

  const melodyModulator = createMelodyModulator(
    context,
    sonification.fundamentalHz,
    toneOscillators,
  )
  if (melodyModulator) sources.push(melodyModulator)

  const orbitalDrift = context.createOscillator()
  const orbitalDriftDepth = context.createGain()
  orbitalDrift.type = 'sine'
  orbitalDrift.frequency.value = sonification.driftHz
  orbitalDriftDepth.gain.value = 7
  orbitalDrift.connect(orbitalDriftDepth)
  toneOscillators.forEach((oscillator) => orbitalDriftDepth.connect(oscillator.detune))
  orbitalDrift.start()
  sources.push(orbitalDrift)

  const pulse = context.createOscillator()
  const pulseDepth = context.createGain()
  pulse.type = 'sine'
  pulse.frequency.value = sonification.pulseHz
  pulseDepth.gain.value = 0.16
  pulse.connect(pulseDepth)
  pulseDepth.connect(toneGain.gain)
  pulse.start()
  sources.push(pulse)

  if (sonification.noise > 0) {
    const noise = context.createBufferSource()
    const noiseFilter = context.createBiquadFilter()
    const noiseGain = context.createGain()
    noise.buffer = createNoiseBuffer(context)
    noise.loop = true
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = Math.min(sonification.filterHz * 0.72, 6000)
    noiseFilter.Q.value = 0.8
    noiseGain.gain.value = sonification.noise
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(outputGain)
    noise.start()
    sources.push(noise)
  }

  outputGain.gain.setTargetAtTime(sonification.gain, now, 0.85)
  graph.analysisVoice = { outputGain, sources, sonification }
}

export function useSolarAudio({ enabled, travelling, analysisSonification = null }) {
  const graphRef = useRef(null)
  const analysisAnalyserRef = useRef(null)
  const enabledRef = useRef(enabled)
  const travellingRef = useRef(travelling)
  const analysisSonificationRef = useRef(analysisSonification)
  enabledRef.current = enabled
  travellingRef.current = travelling
  analysisSonificationRef.current = analysisSonification

  const ensureAudio = useCallback(() => {
    if (!graphRef.current) {
      graphRef.current = createAudioGraph()
      analysisAnalyserRef.current = graphRef.current?.analysisAnalyser ?? null
      if (graphRef.current && analysisSonificationRef.current) {
        startSonificationVoice(graphRef.current, analysisSonificationRef.current)
        graphRef.current.ambientGain.gain.value = 0.18
      }
    }
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

  useEffect(() => {
    if (!graphRef.current && enabled && analysisSonification) ensureAudio()
    const graph = graphRef.current
    if (!graph) return

    const now = graph.context.currentTime
    graph.ambientGain.gain.cancelScheduledValues(now)
    graph.ambientGain.gain.setTargetAtTime(analysisSonification ? 0.18 : 0.58, now, 0.9)

    if (analysisSonification) {
      if (graph.analysisVoice?.sonification !== analysisSonification) {
        startSonificationVoice(graph, analysisSonification)
      }
    } else stopSonificationVoice(graph)
  }, [analysisSonification, enabled, ensureAudio])

  useEffect(() => () => {
    if (graphRef.current) stopSonificationVoice(graphRef.current, 0.05)
    graphRef.current?.context.close().catch(() => {})
    graphRef.current = null
    analysisAnalyserRef.current = null
  }, [])

  return { ensureAudio, analysisAnalyserRef }
}
