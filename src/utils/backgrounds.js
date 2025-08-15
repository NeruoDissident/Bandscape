// Background image utilities (Vite)
// Place your images under:
// - src/assets/backgrounds/random/*.{jpg,png,webp}
// - src/assets/backgrounds/genres/<genre_id>/*.{jpg,png,webp}
// Where <genre_id> matches your data ids, e.g., "genre_pop_punk", "genre_punk_rock".

const randomModules = import.meta.glob('../assets/backgrounds/random/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP,gif,GIF}', {
  eager: true,
  as: 'url'
})

const genreModules = import.meta.glob('../assets/backgrounds/genres/*/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP,gif,GIF}', {
  eager: true,
  as: 'url'
})

const randomImages = Object.values(randomModules).filter(Boolean)

// Build mapping: { genre_id: [urls...] }
const genreToImages = (() => {
  const map = new Map()
  Object.entries(genreModules).forEach(([path, url]) => {
    // path like ../assets/backgrounds/genres/genre_pop_punk/img1.jpg
    const parts = path.split('/')
    const idx = parts.indexOf('genres')
    const key = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : null
    if (!key) return
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(url)
  })
  return map
})()

function pickRandom(arr) {
  if (!arr || arr.length === 0) return null
  const i = Math.floor(Math.random() * arr.length)
  return arr[i]
}

export function getRandomBackground(prevUrl = null) {
  if (randomImages.length === 0) return null
  if (randomImages.length === 1) return randomImages[0]
  // Try to avoid immediate repeat
  let url = pickRandom(randomImages)
  if (prevUrl && randomImages.length > 1) {
    let guard = 5
    while (url === prevUrl && guard-- > 0) url = pickRandom(randomImages)
  }
  return url
}

export function getGenreBackground(genreIds = []) {
  for (const gid of genreIds) {
    const imgs = genreToImages.get(gid)
    if (imgs && imgs.length) return pickRandom(imgs)
  }
  return null
}

export function getBackgroundForNode(node, byId, prevUrl = null) {
  if (!node) return getRandomBackground(prevUrl)
  // If the node itself is a genre
  if (node.type === 'genre') {
    const url = getGenreBackground([node.id])
    return url || getRandomBackground(prevUrl)
  }
  // If the node has tag_ids containing genre ids
  let genreIds = []
  if (Array.isArray(node.tag_ids)) {
    genreIds = node.tag_ids.filter(id => typeof id === 'string' && id.startsWith('genre_'))
  }
  // For links like bands/labels that may reference genres differently (fallback via byId)
  // Not needed for now; ids in tag_ids are sufficient for bands.
  const url = getGenreBackground(genreIds)
  return url || getRandomBackground(prevUrl)
}


