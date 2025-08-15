import { useMemo, useState } from 'react'
import useDataStore from '../store/DataStore'

function normalize(str) {
  return (str || '').toLowerCase()
}

export default function SearchBar() {
  const { nodes, setSelectedNode } = useDataStore()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const allowedTypes = ['band', 'member', 'label', 'venue', 'event']

  const results = useMemo(() => {
    const query = normalize(q)
    if (!query) return []
    const filtered = nodes.filter(n => allowedTypes.includes(n.type))
    return filtered.filter(n => {
      if (normalize(n.name).includes(query)) return true
      if (Array.isArray(n.aliases)) {
        return n.aliases.some(a => normalize(a).includes(query))
      }
      return false
    }).slice(0, 8)
  }, [q, nodes])

  const handleSelect = (node) => {
    setSelectedNode(node)
    setOpen(false)
  }

  return (
    <div className="searchbar">
      <input
        value={q}
        placeholder="Search bands, members, labels, venues, events"
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results.length > 0) {
            handleSelect(results[0])
          }
        }}
      />
      {open && results.length > 0 && (
        <div className="search-results">
          {results.map(n => (
            <div key={n.id} className="search-item" onMouseDown={() => handleSelect(n)}>
              <span className={`dot ${n.type}`} />
              <span className="name">{n.name}</span>
              <span className="type">{n.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
