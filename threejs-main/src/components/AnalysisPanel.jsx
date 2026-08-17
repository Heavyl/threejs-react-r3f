import { useEffect, useRef, useState } from 'react'
import AudioVisualizer from './AudioVisualizer'

function FactsContent({ panelSection, language }) {
  return (
    <dl className="analysis-panel__facts">
      {panelSection.items.map((fact) => (
        <div key={fact.id}>
          <dt>{fact.label[language]}</dt>
          <dd>{fact.value[language]}</dd>
        </div>
      ))}
    </dl>
  )
}

function LayersContent({
  closing,
  config,
  expanded,
  language,
  onSelectSection,
  selectedSection,
}) {
  return (
    <>
      <div className="analysis-panel__sections" aria-label={config.title[language]}>
        {config.sections.map((section) => (
          <button
            key={section.id}
            className={section.id === selectedSection.id ? 'is-active' : ''}
            style={{ '--analysis-layer-color': section.color }}
            type="button"
            disabled={closing}
            tabIndex={expanded ? 0 : -1}
            aria-pressed={section.id === selectedSection.id}
            onClick={() => onSelectSection(section.id)}
          >
            <span aria-hidden="true" />
            {section.name[language]}
          </button>
        ))}
      </div>

      <section className="analysis-panel__detail" aria-live="polite">
        <div className="analysis-panel__detail-heading">
          <span style={{ backgroundColor: selectedSection.color }} aria-hidden="true" />
          <div>
            <h3>{selectedSection.name[language]}</h3>
            {selectedSection.range && <p>{selectedSection.range[language]}</p>}
          </div>
        </div>
        <p>{selectedSection.description[language]}</p>
      </section>
    </>
  )
}

export default function AnalysisPanel({
  audioAnalyserRef,
  audioVisualizationActive,
  closing,
  config,
  language,
  layerRevealRequestId,
  onClose,
  onSelectSection,
  selectedSectionId,
  text,
}) {
  const [expandedSectionIds, setExpandedSectionIds] = useState(() => new Set())
  const previousLayerRevealRequestId = useRef(layerRevealRequestId)
  const selectedSection = config.sections.find(({ id }) => id === selectedSectionId)
    ?? config.sections[0]
  const isLayeredBody = config.type === 'layered-body'

  const togglePanelSection = (sectionId) => {
    setExpandedSectionIds((currentIds) => {
      const nextIds = new Set(currentIds)
      if (nextIds.has(sectionId)) nextIds.delete(sectionId)
      else nextIds.add(sectionId)
      return nextIds
    })
  }

  useEffect(() => {
    if (previousLayerRevealRequestId.current === layerRevealRequestId) return
    previousLayerRevealRequestId.current = layerRevealRequestId
    setExpandedSectionIds((currentIds) => {
      const nextIds = new Set(currentIds)
      config.panelSections.forEach((panelSection) => {
        if (panelSection.type === 'layers' || panelSection.type === 'details') {
          nextIds.add(panelSection.id)
        }
      })
      return nextIds
    })
  }, [config.panelSections, layerRevealRequestId])

  return (
    <aside
      className={`analysis-panel${closing ? ' is-closing' : ''}`}
      aria-label={isLayeredBody ? text.panelLabel : text.informationPanelLabel}
      aria-hidden={closing}
    >
      <header className="analysis-panel__header">
        <div className="analysis-panel__identity">
          <p>{isLayeredBody ? text.eyebrow : text.informationEyebrow}</p>
          <h2>{config.title[language]}</h2>
        </div>
        {config.sonification && (
          <AudioVisualizer
            active={audioVisualizationActive && !closing}
            analyserRef={audioAnalyserRef}
            label={text.audioVisualizer}
          />
        )}
        <button disabled={closing} type="button" aria-label={text.close} title={text.close} onClick={onClose}>×</button>
      </header>

      <div className="analysis-panel__content">
        <p className="analysis-panel__summary">{config.summary[language]}</p>

        <div className="analysis-panel__accordions">
          {config.panelSections.map((panelSection) => {
            const expanded = expandedSectionIds.has(panelSection.id)
            const title = panelSection.title[language]
            const contentId = `analysis-${config.id}-${panelSection.id}`

            return (
              <section className="analysis-panel__accordion" key={panelSection.id}>
                <div className="analysis-panel__section-heading">
                  <h3>{title}</h3>
                  <button
                    type="button"
                    className="analysis-panel__collapse-button"
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    aria-label={`${expanded ? text.collapseSection : text.expandSection}: ${title}`}
                    disabled={closing}
                    onClick={() => togglePanelSection(panelSection.id)}
                  >
                    <span aria-hidden="true">{expanded ? '−' : '+'}</span>
                  </button>
                </div>
                <div
                  id={contentId}
                  className={`analysis-panel__collapsible${expanded ? '' : ' is-collapsed'}`}
                  aria-hidden={!expanded}
                >
                  <div className="analysis-panel__collapsible-inner">
                    {panelSection.type === 'facts' ? (
                      <FactsContent panelSection={panelSection} language={language} />
                    ) : (
                      <LayersContent
                        closing={closing}
                        config={config}
                        expanded={expanded}
                        language={language}
                        onSelectSection={onSelectSection}
                        selectedSection={selectedSection}
                      />
                    )}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
