import { TRANSLATIONS } from '../i18n/translations'

const MAX_TIME_SCALE = 86400

function timeScaleToSliderValue(value) {
  return Math.log(Math.max(1, value)) / Math.log(MAX_TIME_SCALE)
}

function sliderValueToTimeScale(value) {
  return Math.round(Math.exp(Number(value) * Math.log(MAX_TIME_SCALE)))
}

function RangeControl({ id, label, value, inputValue = value, min, max, step, digits = 1, suffix = '', formatValue, parseValue = Number, onChange }) {
  return (
    <div className="control-row control-row--range">
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{formatValue ? formatValue(value) : `${value.toFixed(digits)}${suffix}`}</output>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={inputValue}
        onChange={(event) => onChange(parseValue(event.target.value))}
      />
    </div>
  )
}

function ToggleControl({ id, label, checked, onChange }) {
  return (
    <label className="control-row control-row--toggle" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>
  )
}

export default function ControlPanel({ language, languageAction, onLanguageToggle, collapsed, onCollapsedChange, mapOpen, onMapToggle, travelSpeedOpen, onTravelSpeedToggle, settings, onSettingChange, onReset, soundEnabled, onSoundToggle }) {
  const text = TRANSLATIONS[language].panel

  return (
    <aside className={`control-panel${collapsed ? ' is-collapsed' : ''}`} aria-label={text.ariaLabel}>
      <header className="control-panel__header">
        <div className="control-panel__title">
          <p className="control-panel__eyebrow">{text.eyebrow}</p>
          <h2>{text.title}</h2>
        </div>
        <div className="control-panel__actions">
          <button
            className="control-panel__language"
            type="button"
            aria-label={languageAction}
            title={languageAction}
            onClick={onLanguageToggle}
          >
            {language === 'en' ? 'FR' : 'EN'}
          </button>
          <button
            className={`control-panel__map${mapOpen ? ' is-active' : ''}`}
            type="button"
            aria-expanded={mapOpen}
            aria-label={language === 'fr' ? (mapOpen ? 'Fermer la mini-carte' : 'Ouvrir la mini-carte') : (mapOpen ? 'Close minimap' : 'Open minimap')}
            title={language === 'fr' ? (mapOpen ? 'Fermer la mini-carte' : 'Ouvrir la mini-carte') : (mapOpen ? 'Close minimap' : 'Open minimap')}
            onClick={onMapToggle}
          >
            <span aria-hidden="true">⌖</span>
          </button>
          <button
            className={`control-panel__travel${travelSpeedOpen ? ' is-active' : ''}`}
            type="button"
            aria-expanded={travelSpeedOpen}
            aria-label={travelSpeedOpen ? text.travelClose : text.travelOpen}
            title={travelSpeedOpen ? text.travelClose : text.travelOpen}
            onClick={onTravelSpeedToggle}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M5 16c3-6 7-10 14-11-1 7-5 11-11 14l-3-3Z" />
              <path d="m9 15-4 4m1-7-3 1 3 3m6 2 1 3 3-4" />
              <circle cx="15" cy="9" r="1.5" />
            </svg>
          </button>
          <button
            className={`control-panel__sound${soundEnabled ? ' is-active' : ''}`}
            type="button"
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? text.soundOff : text.soundOn}
            title={soundEnabled ? text.soundOff : text.soundOn}
            onClick={onSoundToggle}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 9h4l5-4v14l-5-4H4z" />
              {soundEnabled
                ? <path d="M16 8c1.3 1 2 2.3 2 4s-.7 3-2 4M19 5c2.1 1.8 3 4.1 3 7s-.9 5.2-3 7" />
                : <path d="m16 9 5 6m0-6-5 6" />}
            </svg>
          </button>
          <button
            className="control-panel__collapse"
            type="button"
            aria-expanded={!collapsed}
            aria-label={collapsed ? text.open : text.close}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? '☰' : '×'}
          </button>
        </div>
      </header>

      {!collapsed && (
        <div className="control-panel__content">
          <fieldset>
            <legend>{text.movement}</legend>
            <RangeControl
              id="time-scale"
              label={text.simulationSpeed}
              value={settings.timeScale}
              inputValue={timeScaleToSliderValue(settings.timeScale)}
              min={0}
              max={1}
              step={0.001}
              formatValue={text.timeScaleValue}
              parseValue={sliderValueToTimeScale}
              onChange={(value) => onSettingChange('timeScale', value)}
            />
          </fieldset>

          <fieldset>
            <legend>{text.display}</legend>
            <RangeControl id="global-scale" label={text.globalScale} value={settings.globalScale} min={0.1} max={4} step={0.05} digits={2} suffix="×" onChange={(value) => onSettingChange('globalScale', value)} />
            <ToggleControl id="show-labels" label={text.labels} checked={settings.showLabels} onChange={(value) => onSettingChange('showLabels', value)} />
            <ToggleControl id="show-orbits" label={text.orbits} checked={settings.showOrbits} onChange={(value) => onSettingChange('showOrbits', value)} />
            <RangeControl id="orbit-opacity" label={text.orbitIntensity} value={settings.orbitOpacity} min={0.01} max={0.5} step={0.01} digits={2} onChange={(value) => onSettingChange('orbitOpacity', value)} />
            <ToggleControl id="show-atmospheres" label={text.atmospheres} checked={settings.showAtmospheres} onChange={(value) => onSettingChange('showAtmospheres', value)} />
            <ToggleControl id="show-rings" label={text.rings} checked={settings.showRings} onChange={(value) => onSettingChange('showRings', value)} />
          </fieldset>

          <fieldset>
            <legend>{text.light}</legend>
            <RangeControl id="ambient-intensity" label={text.ambientLight} value={settings.ambientIntensity} min={0} max={1} step={0.01} digits={2} onChange={(value) => onSettingChange('ambientIntensity', value)} />
            <RangeControl id="sun-intensity" label={text.solarIntensity} value={settings.sunLightIntensity} min={0} max={10} step={0.1} suffix="×" onChange={(value) => onSettingChange('sunLightIntensity', value)} />
            <RangeControl id="background-intensity" label={text.backgroundBrightness} value={settings.backgroundIntensity} min={0} max={2} step={0.05} digits={2} suffix="×" onChange={(value) => onSettingChange('backgroundIntensity', value)} />
          </fieldset>

          <button className="control-panel__reset" type="button" onClick={onReset}>{text.reset}</button>
        </div>
      )}
    </aside>
  )
}







