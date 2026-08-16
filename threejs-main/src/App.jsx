import { useProgress } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSolarAudio } from './audio/useSolarAudio'
import ControlPanel from './components/ControlPanel'
import DistanceCounter from './components/DistanceCounter'
import TravelDistortion from './components/TravelDistortion'
import {
  DEFAULT_SYSTEM_SETTINGS,
  SPEED_OF_LIGHT_KM_S,
  TRAVEL_SPEED_PRESETS,
} from './config/systemSettings'
import { getBodyLabel, TRANSLATIONS } from './i18n/translations'
import SolarSystem from './SolarSystem'
import { formatDuration } from './utils/formatDuration'

const MIN_LOADING_DURATION_MS = 3000
const MOBILE_PERFORMANCE_QUERY = '(max-width: 768px), (pointer: coarse)'

function useMobilePerformanceProfile() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(MOBILE_PERFORMANCE_QUERY).matches,
  )
  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_PERFORMANCE_QUERY)
    const updateProfile = () => setIsMobile(mediaQuery.matches)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateProfile)
      return () => mediaQuery.removeEventListener('change', updateProfile)
    }
    mediaQuery.addListener(updateProfile)
    return () => mediaQuery.removeListener(updateProfile)
  }, [])
  return isMobile
}
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

function findClosestTravelSpeedIndex(speedKmS) {
  return TRAVEL_SPEED_PRESETS.reduce((closestIndex, preset, index) => {
    const closestDistance = Math.abs(Math.log(
      TRAVEL_SPEED_PRESETS[closestIndex].speedKmS / speedKmS,
    ))
    const distance = Math.abs(Math.log(preset.speedKmS / speedKmS))
    return distance < closestDistance ? index : closestIndex
  }, 0)
}

function TravelSpeedControl({ id, label, language, value, onChange }) {
  const presetIndex = findClosestTravelSpeedIndex(value)
  const preset = TRAVEL_SPEED_PRESETS[presetIndex]
  const speedFormatter = new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: preset.speedKmS === SPEED_OF_LIGHT_KM_S
      ? 3
      : preset.speedKmS < 100 ? 2 : 1,
  })

  return (
    <div className="travel-speed-control control-row control-row--range control-row--preset">
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id} title={preset.label[language]}>{preset.label[language]}</output>
      <input
        id={id}
        type="range"
        min="0"
        max={TRAVEL_SPEED_PRESETS.length - 1}
        step="1"
        value={presetIndex}
        list={`${id}-marks`}
        onChange={(event) => {
          const nextPreset = TRAVEL_SPEED_PRESETS[Number(event.target.value)]
          onChange(nextPreset.speedKmS)
        }}
      />
      <datalist id={`${id}-marks`}>
        {TRAVEL_SPEED_PRESETS.map((option, index) => (
          <option key={option.id} value={index} label={option.label[language]} />
        ))}
      </datalist>
      <div className="control-row__preset-meta">
        <span>{speedFormatter.format(preset.speedKmS)} km/s</span>
      </div>
    </div>
  )
}


export default function App() {
  const mobilePerformance = useMobilePerformanceProfile()
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
  const [settingsCollapsed, setSettingsCollapsed] = useState(true)
  const [mobileTravelSpeedOpen, setMobileTravelSpeedOpen] = useState(false)
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
        dpr={mobilePerformance ? 1 : [1, 1.5]}
        gl={{ antialias: !mobilePerformance, powerPreference: 'high-performance', logarithmicDepthBuffer: true }}
      >
        <Suspense fallback={null}>
          <SolarSystem
            selectedBody={selectedBody}
            focusedBody={focusedBody}
            language={language}
            travelling={travelling}
            settings={settings}
            mobilePerformance={mobilePerformance}
            onSelect={selectBody}
            onTravellingChange={setTravelling}
            onTravelPreviewChange={setTravelPreview}
          />
          <SceneReady onReady={() => setSceneRendered(true)} />
          <TravelDistortion mobilePerformance={mobilePerformance} />
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

      <aside className="travel-speed-panel travel-speed-panel--desktop" aria-label={text.panel.travelSpeed}>
        <TravelSpeedControl
          id="travel-speed-desktop"
          label={text.panel.travelSpeed}
          language={language}
          value={settings.travelSpeedKmS}
          onChange={(value) => updateSetting('travelSpeedKmS', value)}
        />
      </aside>

      <ControlPanel
        language={language}
        languageAction={text.languageAction}
        onLanguageToggle={() => setLanguage((current) => (current === 'en' ? 'fr' : 'en'))}
        collapsed={settingsCollapsed}
        onCollapsedChange={(value) => {
          setSettingsCollapsed(value)
          if (!value) setMobileTravelSpeedOpen(false)
        }}
        travelSpeedOpen={mobileTravelSpeedOpen}
        onTravelSpeedToggle={() => {
          setMobileTravelSpeedOpen((value) => !value)
          setSettingsCollapsed(true)
        }}
        settings={settings}
        onSettingChange={updateSetting}
        onReset={resetSettings}
        soundEnabled={soundEnabled}
        onSoundToggle={toggleSound}
      />

      {mobileTravelSpeedOpen && (
        <aside className="travel-speed-panel travel-speed-panel--mobile" aria-label={text.panel.travelSpeed}>
          <TravelSpeedControl
            id="travel-speed-mobile"
            label={text.panel.travelSpeed}
            language={language}
            value={settings.travelSpeedKmS}
            onChange={(value) => updateSetting('travelSpeedKmS', value)}
          />
        </aside>
      )}

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
          {(!travelling || hasPendingTarget) && (
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







