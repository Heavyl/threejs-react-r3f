import { useProgress } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSolarAudio } from './audio/useSolarAudio'
import ControlPanel from './components/ControlPanel'
import DistanceCounter from './components/DistanceCounter'
import TravelDistortion from './components/TravelDistortion'
import { DEFAULT_SYSTEM_SETTINGS } from './config/systemSettings'
import { getBodyLabel, TRANSLATIONS } from './i18n/translations'
import SolarSystem from './SolarSystem'
import { formatDuration } from './utils/formatDuration'

const MIN_LOADING_DURATION_MS = 3000

function SceneReady({ onReady }) {
  const renderedFrames = useRef(0)

  useFrame(() => {
    renderedFrames.current += 1
    if (renderedFrames.current === 3) onReady()
  })

  return null
}

function LoadingScreen({ ready, progress, text }) {
  const displayedProgress = ready ? 100 : Math.min(100, Math.max(0, progress))

  return (
    <div
      className={`loading-screen${ready ? ' is-ready' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={ready}
    >
      <div className="loading-screen__content">
        <div className="loading-system" aria-hidden="true">
          <span className="loading-system__sun" />
          <span className="loading-system__orbit loading-system__orbit--one"><i /></span>
          <span className="loading-system__orbit loading-system__orbit--two"><i /></span>
          <span className="loading-system__orbit loading-system__orbit--three"><i /></span>
        </div>
        <p className="loading-screen__eyebrow">{text.loadingEyebrow}</p>
        <h1>{text.loadingTitle}</h1>
        <p className="loading-screen__status">{text.loading(displayedProgress)}</p>
        <div className="loading-screen__track" aria-hidden="true">
          <span style={{ transform: `scaleX(${displayedProgress / 100})` }} />
        </div>
      </div>
    </div>
  )
}

function formatPreviewDistance(distanceKm, language) {
  const formatter = new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
    notation: distanceKm >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: distanceKm >= 1_000_000 ? 2 : 0,
  })
  return `${formatter.format(Math.max(0, distanceKm))} km`
}


export default function App() {
  const [language, setLanguage] = useState('en')
  const [selectedBody, setSelectedBody] = useState('Earth')
  const [focusedBody, setFocusedBody] = useState('Earth')
  const [travelling, setTravelling] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [travelPreview, setTravelPreview] = useState(null)
  const [sceneRendered, setSceneRendered] = useState(false)
  const [minimumLoadingElapsed, setMinimumLoadingElapsed] = useState(false)
  const [settings, setSettings] = useState({ ...DEFAULT_SYSTEM_SETTINGS })
  const [hudCollapsed, setHudCollapsed] = useState(false)
  const appShellRef = useRef(null)
  const hudRef = useRef(null)
  const { progress } = useProgress()
  const ensureAudio = useSolarAudio({ enabled: soundEnabled, travelling })

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumLoadingElapsed(true), MIN_LOADING_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const shell = appShellRef.current
    const hud = hudRef.current
    if (!shell || !hud) return undefined

    const updateHudHeight = () => {
      shell.style.setProperty('--mobile-hud-height', `${hud.getBoundingClientRect().height}px`)
    }
    const observer = new ResizeObserver(updateHudHeight)
    observer.observe(hud)
    window.addEventListener('resize', updateHudHeight)
    updateHudHeight()

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateHudHeight)
    }
  }, [])

  const sceneReady = sceneRendered && minimumLoadingElapsed

  const updateSetting = (key, value) => {
    setSettings((currentSettings) => ({ ...currentSettings, [key]: value }))
  }

  const resetSettings = () => setSettings({ ...DEFAULT_SYSTEM_SETTINGS })

  const toggleSound = () => {
    if (!soundEnabled) ensureAudio()
    setSoundEnabled((current) => !current)
  }

  const selectBody = (bodyName) => {
    if (travelling) return

    if (bodyName === selectedBody) {
      if (bodyName !== focusedBody) setFocusedBody(bodyName)
      return
    }

    setSelectedBody(bodyName)
  }

  const text = TRANSLATIONS[language]
  const hasPendingTarget = selectedBody !== focusedBody
  const selectedLabel = getBodyLabel(selectedBody, language)
  const focusedLabel = getBodyLabel(focusedBody, language)

  return (
    <main ref={appShellRef} className="app-shell">
      <Canvas
        camera={{ fov: 55, near: 0.0001, far: 5000000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true }}
      >
        <Suspense fallback={null}>
          <SolarSystem
            selectedBody={selectedBody}
            focusedBody={focusedBody}
            language={language}
            travelling={travelling}
            settings={settings}
            onSelect={selectBody}
            onTravellingChange={setTravelling}
            onTravelPreviewChange={setTravelPreview}
          />
          <SceneReady onReady={() => setSceneRendered(true)} />
          <TravelDistortion />
        </Suspense>
      </Canvas>

      <LoadingScreen ready={sceneReady} progress={progress} text={text} />

      <button
        className="language-switch language-switch--desktop"
        type="button"
        aria-label={text.languageAction}
        title={text.languageAction}
        onClick={() => setLanguage((current) => (current === 'en' ? 'fr' : 'en'))}
      >
        {language === 'en' ? 'FR' : 'EN'}
      </button>

      <ControlPanel
        language={language}
        languageAction={text.languageAction}
        onLanguageToggle={() => setLanguage((current) => (current === 'en' ? 'fr' : 'en'))}
        settings={settings}
        onSettingChange={updateSetting}
        onReset={resetSettings}
        soundEnabled={soundEnabled}
        onSoundToggle={toggleSound}
      />

      <section
        ref={hudRef}
        className={`hud${hudCollapsed ? ' is-collapsed' : ''}`}
        aria-live="polite"
      >
        <div className="hud__header">
          <div className="hud__identity">
            {travelling && <p className="travelling">{text.travellingTo(focusedLabel)}</p>}
            <h1>{focusedLabel}</h1>
          </div>
          <button
            className="hud__collapse"
            type="button"
            aria-expanded={!hudCollapsed}
            aria-label={hudCollapsed ? text.travelPanelOpen : text.travelPanelClose}
            title={hudCollapsed ? text.travelPanelOpen : text.travelPanelClose}
            onClick={() => setHudCollapsed((value) => !value)}
          >
            <span aria-hidden="true">{hudCollapsed ? '+' : '-'}</span>
          </button>
        </div>
        <div className="hud__details">
          {!travelling && (
            <p className={hasPendingTarget ? 'target-hint is-active' : 'target-hint'}>
              {hasPendingTarget
                ? travelPreview
                  ? text.targetHint(
                      selectedLabel,
                      formatPreviewDistance(travelPreview.distanceKm, language),
                      formatDuration(travelPreview.durationSeconds, language),
                    )
                  : text.targetCalculating(selectedLabel)
                : text.selectionHint}
            </p>
          )}
          <DistanceCounter language={language} />
        </div>
      </section>
    </main>
  )
}







