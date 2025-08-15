import useDataStore from '../store/DataStore'

function InfoPanel() {
  const { selectedNode } = useDataStore()

  if (!selectedNode) {
    return null
  }

  const { name, type, image_url, location, description, start_date, end_date, link_urls } = selectedNode
  const typeClass = (type || '').toLowerCase()
  const years = start_date || end_date ? `${start_date || ''}${start_date && end_date ? ' — ' : ''}${end_date || (start_date ? 'Present' : '')}` : ''

  return (
    <div className="info-panel">
      <div className="info-content">
        <h3>
          {name}
          {type && <span className={`info-type-badge ${typeClass}`}>{type}</span>}
        </h3>
        {years && <div className="info-years">{years}</div>}
        
        {image_url && (
          <img 
            src={image_url} 
            alt={name}
            className="info-image"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        )}
        
        {location && (
          <p className="location">
            {location.city && location.country ? `${location.city}, ${location.country}` : 
             location.city || location.country || 
             (typeof location === 'string' ? location : '')}
          </p>
        )}
        
        {description && (
          <p className="description">{description}</p>
        )}

        {Array.isArray(link_urls) && link_urls.length > 0 && (
          <div className="info-links">
            {link_urls.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer">
                Link {i + 1}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default InfoPanel
