import { useEffect, useState } from 'react'
import useDataStore from '../store/DataStore'

export default function SavedViews() {
  const {
    getSavedViews,
    saveCurrentView,
    renameSavedView,
    deleteSavedView,
    loadSavedView,
    showToast
  } = useDataStore()
  const [list, setList] = useState([])
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const refresh = () => setList(getSavedViews())

  useEffect(() => { refresh() }, [])

  const onSave = () => {
    if (!name.trim()) return
    saveCurrentView(name.trim())
    setName('')
    setSaving(false)
    refresh()
    showToast('View saved')
  }

  const onRename = () => {
    const id = selectedId
    if (!id) return
    const next = prompt('Rename view to:', list.find(v => v.id === id)?.name || '')
    if (next && next.trim()) {
      renameSavedView(id, next.trim())
      refresh()
      showToast('Renamed')
    }
  }

  const onDelete = () => {
    const id = selectedId
    if (!id) return
    if (confirm('Delete this saved view?')) {
      deleteSavedView(id)
      setSelectedId('')
      refresh()
      showToast('Deleted')
    }
  }

  const onLoad = () => {
    const id = selectedId
    if (!id) return
    loadSavedView(id)
    showToast('View loaded')
  }

  return (
    <div className="saved-views">
      <button className="btn" onClick={() => setSaving(true)}>Save View</button>
      {saving && (
        <div className="save-dialog">
          <input value={name} placeholder="View name" onChange={(e) => setName(e.target.value)} />
          <button className="btn" onClick={onSave} disabled={!name.trim()}>Save</button>
          <button className="btn" onClick={() => { setSaving(false); setName('') }}>Cancel</button>
        </div>
      )}

      <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
        <option value="">Saved Views…</option>
        {list.map(v => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>
      <button className="btn" onClick={onLoad} disabled={!selectedId}>Load</button>
      <button className="btn" onClick={onRename} disabled={!selectedId}>Rename</button>
      <button className="btn" onClick={onDelete} disabled={!selectedId}>Delete</button>
    </div>
  )
}

