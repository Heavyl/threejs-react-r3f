import { useEffect, useRef, useState } from 'react'
import { CELESTIAL_BODIES } from '../data/celestialBodies'
import { getBodyLabel } from '../i18n/translations'

const MAP_BODIES = CELESTIAL_BODIES.filter((body) => !body.parent && body.name !== 'Sun')
const MAX_ORBIT_KM = Math.max(...MAP_BODIES.map((body) => body.semiMajorAxisKm))

function solveOrbitPosition(body, simulationTime) {
  const meanAnomaly = body.phase + simulationTime * body.orbitalAngularSpeed
  const eccentricity = body.eccentricity ?? 0
  let eccentricAnomaly = meanAnomaly

  for (let iteration = 0; iteration < 6; iteration += 1) {
    eccentricAnomaly -= (
      eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly
    ) / (1 - eccentricity * Math.cos(eccentricAnomaly))
  }

  return {
    xKm: (Math.cos(eccentricAnomaly) - eccentricity) * body.semiMajorAxisKm,
    yKm: Math.sin(eccentricAnomaly)
      * body.semiMajorAxisKm
      * Math.sqrt(1 - eccentricity * eccentricity),
  }
}

export default function MinimapPanel({
  collapsed,
  focusedBody,
  focusedSpacecraft,
  language,
  onSelectBody,
  onSelectShip,
  onSelectSpacecraft,
  onCollapsedChange,
  selectedBody,
  settings,
  shipFocused,
}) {
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const canvasRef = useRef()
  const markersRef = useRef([])
  const simulationTimeRef = useRef(0)
  const panRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    let animationFrame
    let previousTimestamp = performance.now()

    const draw = (timestamp) => {
      const delta = Math.min(0.1, Math.max(0, (timestamp - previousTimestamp) / 1000))
      previousTimestamp = timestamp
      simulationTimeRef.current += delta * settings.timeScale

      const bounds = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(bounds.width * dpr))
      const height = Math.max(1, Math.round(bounds.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, bounds.width, bounds.height)

      const centerX = bounds.width / 2 + panRef.current.x
      const centerY = bounds.height / 2 + panRef.current.y
      const availableRadius = Math.max(20, Math.min(bounds.width, bounds.height) / 2 - 16)
      const pixelsPerKilometer = availableRadius / MAX_ORBIT_KM * zoom
      const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, availableRadius)
      glow.addColorStop(0, 'rgba(45, 96, 145, 0.18)')
      glow.addColorStop(0.55, 'rgba(12, 30, 52, 0.08)')
      glow.addColorStop(1, 'rgba(2, 7, 15, 0)')
      context.fillStyle = glow
      context.fillRect(0, 0, bounds.width, bounds.height)

      context.lineWidth = 1
      MAP_BODIES.forEach((body) => {
        const radiusX = body.semiMajorAxisKm * pixelsPerKilometer
        const radiusY = radiusX * Math.sqrt(1 - (body.eccentricity ?? 0) ** 2)
        const focusOffset = -(body.eccentricity ?? 0) * radiusX
        context.beginPath()
        context.ellipse(centerX + focusOffset, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
        context.strokeStyle = body.name === focusedBody
          ? 'rgba(142, 203, 255, 0.34)'
          : 'rgba(255, 255, 255, 0.075)'
        context.stroke()
      })

      const sunGlow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 12)
      sunGlow.addColorStop(0, '#fff3b5')
      sunGlow.addColorStop(0.28, '#ffc65c')
      sunGlow.addColorStop(1, 'rgba(255, 156, 43, 0)')
      context.fillStyle = sunGlow
      context.beginPath()
      context.arc(centerX, centerY, 12, 0, Math.PI * 2)
      context.fill()

      const markers = [{ name: 'Sun', x: centerX, y: centerY }]
      let focusedMarker

      MAP_BODIES.forEach((body) => {
        const orbitalPosition = solveOrbitPosition(body, simulationTimeRef.current)
        const x = centerX + orbitalPosition.xKm * pixelsPerKilometer
        const y = centerY + orbitalPosition.yKm * pixelsPerKilometer
        const isFocused = body.name === focusedBody
        const isSelected = body.name === selectedBody
        const isInsideMap = (
          x >= -12
          && x <= bounds.width + 12
          && y >= -12
          && y <= bounds.height + 12
        )

        if (!isInsideMap) return

        if (isFocused || isSelected) {
          context.beginPath()
          context.arc(x, y, isFocused ? 7 : 6, 0, Math.PI * 2)
          context.strokeStyle = isFocused ? '#ffd28e' : '#8ecbff'
          context.lineWidth = 1.5
          context.stroke()
        }

        context.beginPath()
        context.arc(x, y, isFocused ? 3.6 : 2.7, 0, Math.PI * 2)
        context.fillStyle = body.orbitColor
        context.fill()

        context.font = isFocused ? '600 9px Roboto, sans-serif' : '500 8px Roboto, sans-serif'
        context.fillStyle = isFocused ? 'rgba(255, 226, 178, 0.95)' : 'rgba(255, 255, 255, 0.48)'
        context.fillText(getBodyLabel(body.name, language), x + 5, y - 4)

        if (isFocused) focusedMarker = { x, y }
        markers.push({ name: body.name, x, y })
      })

      if (focusedMarker) {
        const shipX = focusedMarker.x + 9
        const shipY = focusedMarker.y - 7
        context.save()
        context.translate(shipX, shipY)
        context.rotate(-0.6)
        context.fillStyle = shipFocused ? '#ffd28e' : '#8edbff'
        context.beginPath()
        context.moveTo(4, 0)
        context.lineTo(-3, -2.6)
        context.lineTo(-1.5, 0)
        context.lineTo(-3, 2.6)
        context.closePath()
        context.fill()
        context.restore()
        markers.push({ name: 'Ship', x: shipX, y: shipY })
      }

      markersRef.current = markers
      animationFrame = requestAnimationFrame(draw)
    }

    animationFrame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animationFrame)
  }, [focusedBody, language, selectedBody, settings.timeScale, shipFocused, zoom])

  const selectMarkerAt = (clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const bounds = canvas.getBoundingClientRect()
    const pointerX = clientX - bounds.left
    const pointerY = clientY - bounds.top
    let closest
    let closestDistance = 13

    markersRef.current.forEach((marker) => {
      const distance = Math.hypot(pointerX - marker.x, pointerY - marker.y)
      if (distance < closestDistance) {
        closest = marker
        closestDistance = distance
      }
    })

    if (!closest) return
    if (closest.name === 'Ship') onSelectShip()
    else onSelectBody(closest.name)
  }

  const startDrag = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
      moved: false,
    }
  }

  const moveDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(deltaX, deltaY) > 3) {
      drag.moved = true
      setDragging(true)
    }
    if (!drag.moved) return
    panRef.current = { x: drag.panX + deltaX, y: drag.panY + deltaY }
  }

  const endDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    setDragging(false)
    if (!drag.moved) selectMarkerAt(event.clientX, event.clientY)
  }

  const cancelDrag = () => {
    dragRef.current = null
    setDragging(false)
  }

  const title = language === 'fr' ? 'Mini-carte' : 'Minimap'
  const scaleLabel = language === 'fr' ? 'Échelle linéaire' : 'Linear scale'

  return (
    <aside className={`minimap-panel${collapsed ? ' is-collapsed' : ''}`} aria-label={title}>
      <header className="minimap-panel__header">
        <div>
          <p>{language === 'fr' ? 'Navigation' : 'Navigation'}</p>
          <h2>{title}</h2>
        </div>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? `${title} — ouvrir` : `${title} — fermer`}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <span aria-hidden="true">{collapsed ? '⌖' : '−'}</span>
        </button>
      </header>
      <div className="minimap-panel__content">
        <canvas
          ref={canvasRef}
          className={`minimap-panel__canvas${dragging ? ' is-dragging' : ''}`}
          aria-label={language === 'fr' ? 'Carte interactive du système solaire' : 'Interactive solar system map'}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={cancelDrag}
          onWheel={(event) => {
            event.preventDefault()
            setZoom((value) => event.deltaY < 0
              ? Math.min(64, value * 2)
              : Math.max(1, value / 2))
          }}
        />
        <div className="minimap-panel__meta">
          <span>{scaleLabel} · {zoom}×</span>
          <strong>{getBodyLabel(focusedBody, language)}</strong>
        </div>
        <div className="minimap-panel__zoom" aria-label={language === 'fr' ? 'Zoom de la mini-carte' : 'Minimap zoom'}>
          <button
            type="button"
            aria-label={language === 'fr' ? 'Dézoomer' : 'Zoom out'}
            disabled={zoom === 1}
            onClick={() => setZoom((value) => Math.max(1, value / 2))}
          >−</button>
          <span>{zoom}×</span>
          <button
            type="button"
            aria-label={language === 'fr' ? 'Zoomer' : 'Zoom in'}
            disabled={zoom === 64}
            onClick={() => setZoom((value) => Math.min(64, value * 2))}
          >+</button>
          <button
            type="button"
            aria-label={language === 'fr' ? 'Recentrer la mini-carte' : 'Recenter minimap'}
            onClick={() => { panRef.current = { x: 0, y: 0 } }}
          >⌾</button>
        </div>
        <div className="minimap-panel__shortcuts" aria-label={language === 'fr' ? 'Engins spatiaux' : 'Spacecraft'}>
          <button className={shipFocused ? 'is-active' : ''} type="button" onClick={onSelectShip}>
            {getBodyLabel('Ship', language)}
          </button>
          {focusedBody === 'Earth' && ['ISS', 'Hubble', 'JWST'].map((name) => (
            <button
              key={name}
              className={focusedSpacecraft === name ? 'is-active' : ''}
              type="button"
              onClick={() => onSelectSpacecraft(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
