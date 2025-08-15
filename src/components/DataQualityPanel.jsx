import { useMemo, useState } from 'react'
import useDataStore from '../store/DataStore'

function toPercent(numerator, denominator) {
  if (!denominator || denominator === 0) return '0%'
  const pct = Math.round((numerator / denominator) * 100)
  return `${pct}%`
}

function downloadCsv(filename, rows) {
  const csv = rows.map(r => r.map(v => {
    const s = v == null ? '' : String(v)
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function DataQualityPanel() {
  const { nodes, links, showToast } = useDataStore()
  const [open, setOpen] = useState(false)

  const stats = useMemo(() => {
    const totalNodes = nodes.length
    const totalLinks = links.length
    const byType = nodes.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {})
    const hasImage = nodes.filter(n => typeof n.image_url === 'string' && n.image_url.trim().length > 0).length
    const hasDesc = nodes.filter(n => typeof n.description === 'string' && n.description.trim().length > 0).length
    const hasCoords = nodes.filter(n => n.location && typeof n.location.lat === 'number' && typeof n.location.lng === 'number').length
    return { totalNodes, totalLinks, byType, hasImage, hasDesc, hasCoords }
  }, [nodes, links])

  const exportMissingCoords = () => {
    const missing = nodes.filter(n => !(n.location && typeof n.location.lat === 'number' && typeof n.location.lng === 'number'))
    const rows = [["id","type","name","city","country"]]
    missing.forEach(n => rows.push([
      n.id,
      n.type,
      n.name || '',
      n.location && n.location.city ? n.location.city : '',
      n.location && n.location.country ? n.location.country : ''
    ]))
    const datePart = new Date().toISOString().slice(0,10)
    downloadCsv(`missing_coordinates_${datePart}.csv`, rows)
    if (showToast) showToast('Exported missing coordinates CSV')
  }

  const exportMissingImages = () => {
    const missing = nodes.filter(n => !(typeof n.image_url === 'string' && n.image_url.trim().length > 0))
    const rows = [["id","type","name"]]
    missing.forEach(n => rows.push([n.id, n.type, n.name || '']))
    const datePart = new Date().toISOString().slice(0,10)
    downloadCsv(`missing_images_${datePart}.csv`, rows)
    if (showToast) showToast('Exported missing images CSV')
  }

  const exportMissingDescriptions = () => {
    const missing = nodes.filter(n => !(typeof n.description === 'string' && n.description.trim().length > 0))
    const rows = [["id","type","name"]]
    missing.forEach(n => rows.push([n.id, n.type, n.name || '']))
    const datePart = new Date().toISOString().slice(0,10)
    downloadCsv(`missing_descriptions_${datePart}.csv`, rows)
    if (showToast) showToast('Exported missing descriptions CSV')
  }

  return (
    <div className="data-quality">
      <button className="dq-toggle" onClick={() => setOpen(v => !v)} title="Data Quality">
        Data Quality
      </button>
      {open && (
        <div className="dq-panel">
          <div className="dq-header">
            <div className="dq-title">Data Quality</div>
            <button className="dq-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="dq-section">
            <div className="dq-subtitle">Dataset Size</div>
            <div className="dq-row">
              <strong>Total</strong>
              <span>
                <span className="dq-badge nodes" title="Nodes">Nodes</span>
                <span className="dq-val">{stats.totalNodes}</span>
                <span className="dq-gap" />
                <span className="dq-badge links" title="Links">Links</span>
                <span className="dq-val">{stats.totalLinks}</span>
              </span>
            </div>
          </div>
          <div className="dq-section">
            <div className="dq-subtitle">Nodes by type</div>
            {Object.entries(stats.byType).map(([t, c]) => (
              <div className="dq-row" key={t}><strong>{t}</strong><span>{c}</span></div>
            ))}
          </div>
          <div className="dq-section">
            <div className="dq-row"><strong>With images</strong><span>{toPercent(stats.hasImage, stats.totalNodes)}</span></div>
            <div className="dq-row"><strong>With description</strong><span>{toPercent(stats.hasDesc, stats.totalNodes)}</span></div>
            <div className="dq-row"><strong>With coordinates</strong><span>{toPercent(stats.hasCoords, stats.totalNodes)}</span></div>
          </div>
          {/* Link date completeness intentionally omitted */}
          <div className="dq-section dq-actions">
            <button onClick={exportMissingCoords}>Export nodes missing coordinates</button>
            <button onClick={exportMissingImages}>Export nodes missing images</button>
            <button onClick={exportMissingDescriptions}>Export nodes missing descriptions</button>
          </div>
        </div>
      )}
    </div>
  )
}


