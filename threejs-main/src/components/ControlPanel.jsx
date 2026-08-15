import { useState } from 'react'
import { TRANSLATIONS } from '../i18n/translations'

function RangeControl({ id, label, value, min, max, step, digits = 1, suffix = '', formatValue, onChange }) {
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
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
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

export default function ControlPanel({ language, settings, onSettingChange, onReset }) {
  const [collapsed, setCollapsed] = useState(true)
  const text = TRANSLATIONS[language].panel

  return (
    <aside className={`control-panel${collapsed ? ' is-collapsed' : ''}`} aria-label={text.ariaLabel}>
      <header className="control-panel__header">
        <div>
          <p className="control-panel__eyebrow">{text.eyebrow}</p>
          <h2>{text.title}</h2>
        </div>
        <button
          className="control-panel__collapse"
          type="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? text.open : text.close}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? '☰' : '×'}
        </button>
      </header>

      {!collapsed && (
        <div className="control-panel__content">
          <fieldset>
            <legend>{text.movement}</legend>
            <RangeControl id="time-scale" label={text.simulationSpeed} value={settings.timeScale} min={0} max={31536000} step={600} formatValue={text.timeScaleValue} onChange={(value) => onSettingChange('timeScale', value)} />
            <RangeControl id="travel-speed" label={text.travelAcceleration} value={settings.travelSpeedMultiplier} min={1} max={200} step={1} formatValue={(value) => `×${value.toFixed(0)}`} onChange={(value) => onSettingChange('travelSpeedMultiplier', value)} />
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



