import useDataStore from '../store/DataStore'

const TYPES = [
  { key: 'band', label: 'Band' },
  { key: 'member', label: 'Member' },
  { key: 'label', label: 'Label' },
  { key: 'venue', label: 'Venue' },
  { key: 'event', label: 'Event' },
]

export default function TypeFilters() {
  const { nodes, filters, toggleFilter, resetFilters, activeView } = useDataStore()

  const counts = TYPES.reduce((acc, t) => {
    const list = nodes.filter(n => n.type === t.key)
    const viewOk = (n) => activeView === 'map'
      ? (n.location && typeof n.location.lat === 'number' && typeof n.location.lng === 'number')
      : true
    // visible count = only when type enabled and passes view criteria
    const visible = filters[t.key]
      ? list.filter(viewOk).length
      : 0
    acc[t.key] = visible
    return acc
  }, {})

  return (
    <div className="type-filters">
      {TYPES.map(t => (
        <button
          key={t.key}
          className={`type-toggle ${t.key} ${filters[t.key] ? 'on' : 'off'}`}
          title={t.label}
          onClick={() => toggleFilter(t.key)}
        >
          <span className="dot" />
          <span className="lbl">{t.label}</span>
          <span className="cnt">{counts[t.key] ?? 0}</span>
        </button>
      ))}
      <button className="reset-filters" onClick={resetFilters}>Reset</button>
    </div>
  )
}
