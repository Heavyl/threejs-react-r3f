import { Html } from '@react-three/drei'

export default function SpacecraftAnalysisHotspots({
  closing = false,
  config,
  language,
  onSelectSection,
  selectedSectionId,
}) {
  if (!config || config.type !== 'information') return null

  return config.sections.map((section) => (
    <Html
      key={section.id}
      center
      position={section.hotspotPosition}
      wrapperClass={`analysis-part-label-wrapper${closing ? ' is-closing' : ''}`}
      zIndexRange={[24, 0]}
    >
      <button
        className={`analysis-part-label${section.id === selectedSectionId ? ' is-active' : ''}`}
        style={{ '--analysis-layer-color': section.color }}
        type="button"
        disabled={closing}
        onPointerDown={(event) => {
          event.stopPropagation()
          onSelectSection(section.id)
        }}
      >
        <span aria-hidden="true" />
        {section.name[language]}
      </button>
    </Html>
  ))
}
