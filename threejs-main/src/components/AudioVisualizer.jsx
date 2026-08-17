import { useEffect, useRef } from 'react'

const BAR_COUNT = 24

function sizeCanvas(canvas, context) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio))
  const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  return { width: canvas.clientWidth, height: canvas.clientHeight }
}

function drawIdle(context, width, height) {
  context.clearRect(0, 0, width, height)
  context.strokeStyle = 'rgba(255, 193, 111, 0.24)'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(3, height / 2)
  context.lineTo(width - 3, height / 2)
  context.stroke()
}

export default function AudioVisualizer({ active, analyserRef, label }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return undefined

    let animationFrame = 0
    let frequencyData = null

    const draw = () => {
      const { width, height } = sizeCanvas(canvas, context)
      const analyser = analyserRef.current
      if (!active || !analyser) {
        drawIdle(context, width, height)
        animationFrame = window.requestAnimationFrame(draw)
        return
      }

      if (!frequencyData || frequencyData.length !== analyser.frequencyBinCount) {
        frequencyData = new Uint8Array(analyser.frequencyBinCount)
      }
      analyser.getByteFrequencyData(frequencyData)
      context.clearRect(0, 0, width, height)

      const gap = 1.5
      const barWidth = Math.max(1, (width - gap * (BAR_COUNT - 1)) / BAR_COUNT)
      const audibleBinLimit = Math.min(
        frequencyData.length - 1,
        Math.ceil(2400 * analyser.fftSize / analyser.context.sampleRate),
      )
      const gradient = context.createLinearGradient(0, height, 0, 0)
      gradient.addColorStop(0, 'rgba(229, 104, 67, 0.5)')
      gradient.addColorStop(0.55, 'rgba(255, 193, 111, 0.9)')
      gradient.addColorStop(1, 'rgba(255, 235, 200, 1)')
      context.fillStyle = gradient

      for (let index = 0; index < BAR_COUNT; index += 1) {
        const binIndex = Math.min(
          audibleBinLimit,
          Math.floor((index / (BAR_COUNT - 1)) ** 1.45 * audibleBinLimit),
        )
        const strength = frequencyData[binIndex] / 255
        const barHeight = Math.max(1, strength * (height - 4))
        const x = index * (barWidth + gap)
        context.fillRect(x, (height - barHeight) / 2, barWidth, barHeight)
      }

      animationFrame = window.requestAnimationFrame(draw)
    }

    draw()
    return () => window.cancelAnimationFrame(animationFrame)
  }, [active, analyserRef])

  return (
    <canvas
      ref={canvasRef}
      className={`analysis-audio-visualizer${active ? ' is-active' : ''}`}
      role="img"
      aria-label={label}
    />
  )
}
