import { useMemo, useState } from 'react'
import useDataStore from '../store/DataStore'

function normalize(str) {
  return (str || '').toLowerCase()
}

export default function PathTray() {
  const {
    nodes,
    pathStartId,
    pathEndId,
    setPathStart,
    setPathEnd,
    pathNodeIds,
    pathNotFound,
    findPath,
    clearPath
  } = useDataStore()

  const [qStart, setQStart] = useState('')
  const [qEnd, setQEnd] = useState('')
  const [openStart, setOpenStart] = useState(false)
  const [openEnd, setOpenEnd] = useState(false)

  const byId = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes])

  const allowedTypes = ['band', 'member', 'label', 'venue', 'event']

  const options = useMemo(() => nodes.filter(n => allowedTypes.includes(n.type)), [nodes])

  const startNode = pathStartId ? byId[pathStartId] : null
  const endNode = pathEndId ? byId[pathEndId] : null

  const resultsStart = useMemo(() => {
    const query = normalize(qStart)
    if (!query) return []
    return options.filter(n => {
      if (normalize(n.name).includes(query)) return true
      if (Array.isArray(n.aliases)) return n.aliases.some(a => normalize(a).includes(query))
      return false
    }).slice(0, 8)
  }, [qStart, options])

  const resultsEnd = useMemo(() => {
    const query = normalize(qEnd)
    if (!query) return []
    return options.filter(n => {
      if (normalize(n.name).includes(query)) return true
      if (Array.isArray(n.aliases)) return n.aliases.some(a => normalize(a).includes(query))
      return false
    }).slice(0, 8)
  }, [qEnd, options])

  const handlePickStart = (node) => {
    setPathStart(node.id)
    setQStart(node.name)
    setOpenStart(false)
  }
  const handlePickEnd = (node) => {
    setPathEnd(node.id)
    setQEnd(node.name)
    setOpenEnd(false)
  }

  const pathLength = pathNodeIds && pathNodeIds.length > 0 ? Math.max(0, pathNodeIds.length - 1) : 0

  return (
    <div className="path-tray" title="Find shortest path between two nodes">
      <div className="path-fields">
        <div className="path-field">
          <label>Start</label>
          <input
            value={qStart}
            placeholder={startNode ? startNode.name : 'Search start'}
            onFocus={() => setOpenStart(true)}
            onChange={(e) => { setQStart(e.target.value); setOpenStart(true) }}
          />
          {openStart && resultsStart.length > 0 && (
            <div className="path-results">
              {resultsStart.map(n => (
                <div key={n.id} className="path-item" onMouseDown={() => handlePickStart(n)}>
                  <span className={`dot ${n.type}`} />
                  <span className="name">{n.name}</span>
                  <span className="type">{n.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="path-field">
          <label>End</label>
          <input
            value={qEnd}
            placeholder={endNode ? endNode.name : 'Search end'}
            onFocus={() => setOpenEnd(true)}
            onChange={(e) => { setQEnd(e.target.value); setOpenEnd(true) }}
          />
          {openEnd && resultsEnd.length > 0 && (
            <div className="path-results">
              {resultsEnd.map(n => (
                <div key={n.id} className="path-item" onMouseDown={() => handlePickEnd(n)}>
                  <span className={`dot ${n.type}`} />
                  <span className="name">{n.name}</span>
                  <span className="type">{n.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="path-actions">
        <button className="btn" onClick={findPath} disabled={!pathStartId || !pathEndId}>Find Path</button>
        <button className="btn" onClick={clearPath}>Clear</button>
        {pathNodeIds.length > 0 && (
          <span className="path-len">Path length: {pathLength} edges</span>
        )}
        {pathNotFound && (
          <span className="path-none">No path found</span>
        )}
      </div>
    </div>
  )}

