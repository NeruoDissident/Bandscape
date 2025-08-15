import useDataStore from '../store/DataStore'

export default function Presets() {
  const { applyPreset, requestFit } = useDataStore()

  const setPreset = (name) => {
    applyPreset(name)
    // Optionally fit to visible after preset change
    requestFit()
  }

  return (
    <div className="presets">
      <button className="preset" onClick={() => setPreset('people')} title="People Only">People</button>
      <button className="preset" onClick={() => setPreset('bands_members')} title="Bands + Members">Bands+Members</button>
      <button className="preset" onClick={() => setPreset('venues_map')} title="Venues Map">Venues</button>
      <button className="preset" onClick={() => setPreset('labels_bands')} title="Labels & Bands">Labels+Bands</button>
    </div>
  )
}
