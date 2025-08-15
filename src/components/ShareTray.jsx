import useDataStore from '../store/DataStore'

export default function ShareTray() {
  const {
    selectedNode,
    byId,
    pathNodeIds,
    requestGraphSnapshot,
    showToast
  } = useDataStore()

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('Copied!')
    } catch (e) {
      console.error('Copy failed', e)
    }
  }

  const onCopyPath = () => {
    if (!pathNodeIds || pathNodeIds.length === 0) return
    const names = pathNodeIds.map(id => byId[id]?.name).filter(Boolean)
    const text = names.join(' → ')
    copyText(text)
  }

  const onCopyNode = () => {
    if (!selectedNode) return
    const n = selectedNode
    const loc = n.location
    const locText = loc ? (
      (loc.city && loc.country) ? `${loc.city}, ${loc.country}` : (loc.city || loc.country || '')
    ) : ''
    const years = n.start_date || n.end_date ? `${n.start_date || ''}${n.start_date && n.end_date ? ' — ' : ''}${n.end_date || (n.start_date ? 'Present' : '')}` : ''
    const urls = Array.isArray(n.link_urls) ? n.link_urls.join('\n') : ''
    const text = [
      `${n.name} (${n.type})`,
      locText ? `Location: ${locText}` : '',
      years ? `Years: ${years}` : '',
      n.description ? `\n${n.description}` : '',
      urls ? `\n${urls}` : ''
    ].filter(Boolean).join('\n')
    copyText(text)
  }

  const onSnapshot = () => {
    requestGraphSnapshot()
  }

  const onShareLink = () => {
    try {
      copyText(window.location.href)
    } catch (e) {
      console.error('Share link failed', e)
    }
  }

  const pathEnabled = !!(pathNodeIds && pathNodeIds.length > 0)
  const nodeEnabled = !!selectedNode

  return (
    <div className="share-tray">
      <button className="btn" onClick={onShareLink} title="Copy page link">Share Link</button>
      <button className="btn" onClick={onCopyPath} disabled={!pathEnabled} title="Copy path text">Copy Path</button>
      <button className="btn" onClick={onCopyNode} disabled={!nodeEnabled} title="Copy selected node info">Copy Node</button>
      <button className="btn" onClick={onSnapshot} title="Export graph as PNG">Snapshot</button>
    </div>
  )
}

