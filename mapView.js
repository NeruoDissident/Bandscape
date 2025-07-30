// mapView.js
// This module provides a simple wrapper around three-globe to display
// geographic points and arcs. It mirrors the Graph3D interface for
// highlighting and filtering, so the two views remain in sync.

class MapView {
  /**
   * Construct a MapView instance.
   * @param {Object} data Graph data with `nodes` and `edges` arrays.
   * @param {string} containerId ID of the element to mount the globe into.
   * @param {Function} onSelect Callback invoked when a point is clicked; receives node id.
   */
  constructor(data, containerId, onSelect) {
    this.container = document.getElementById(containerId);
    this.onSelect = onSelect;
    // Build a lookup for quick access to nodes by id.
    this.nodesById = {};
    (data.nodes || []).forEach((n) => {
      this.nodesById[n.id] = n;
    });
    // Build raw points using nodes that have coordinates.
    const colorByType = {
      band: '#f39c12',
      member: '#3498db',
      producer: '#9b59b6',
      label: '#1abc9c',
      venue: '#e67e22',
      event: '#e74c3c',
      family: '#95a5a6'
    };
    this.rawPoints = (data.nodes || [])
      .filter((n) => n.location && typeof n.location.lat === 'number' && typeof n.location.lon === 'number')
      .map((n) => {
        return {
          id: n.id,
          lat: n.location.lat,
          lng: n.location.lon,
          name: n.name || n.id,
          type: n.type,
          color: colorByType[n.type] || '#888888'
        };
      });
    // Build raw arcs using edges whose endpoints both have coordinates.
    this.rawArcs = (data.edges || [])
      .map((e) => {
        const source = this.nodesById[e.source];
        const target = this.nodesById[e.target];
        if (
          source &&
          target &&
          source.location &&
          typeof source.location.lat === 'number' &&
          typeof source.location.lon === 'number' &&
          target.location &&
          typeof target.location.lat === 'number' &&
          typeof target.location.lon === 'number'
        ) {
          return {
            sourceLat: source.location.lat,
            sourceLng: source.location.lon,
            targetLat: target.location.lat,
            targetLng: target.location.lon,
            color: colorByType[source.type] || '#888888'
          };
        }
        return null;
      })
      .filter(Boolean);
    // Create the globe instance. The texture is loaded from a CDN.
    this.globe = Globe()(this.container)
      .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg')
      .backgroundColor('#000000')
      .pointOfView({ lat: 20, lng: 0, altitude: 2 })
      .pointsData(this.rawPoints)
      .pointLat('lat')
      .pointLng('lng')
      .pointColor((p) => p.color)
      .pointRadius(0.15)
      .pointAltitude(0.02)
      .arcsData(this.rawArcs)
      .arcColor((a) => a.color)
      .arcAltitude(0.1)
      .arcStroke(0.5)
      .onPointClick((point) => {
        if (typeof this.onSelect === 'function') {
          this.onSelect(point.id);
        }
      });
    // Maintain filter options for later updates.
    this.filterOptions = {
      types: {
        band: true,
        member: true,
        producer: true,
        label: true,
        venue: true,
        event: true,
        family: true
      },
      mode: 'normal',
      time: new Date().getFullYear()
    };
  }

  /**
   * Highlight a node by raising its altitude. Resets altitude on others.
   * @param {string|null} id Node id to highlight, or null to clear highlight.
   */
  highlightNode(id) {
    const highlightId = id;
    this.globe.pointAltitude((point) => {
      return highlightId && point.id === highlightId ? 0.06 : 0.02;
    });
  }

  /**
   * Update filters and refresh the globe. Filters should match the format used
   * in Graph3D: { types: { band: boolean, member: boolean }, mode: 'normal'|'ghost'|'hide' }.
   * The globe supports normal and ghost modes by altering colours and altitude.
   */
  updateFilters(newFilters) {
    this.filterOptions = Object.assign({}, this.filterOptions, newFilters);
    const { types, mode } = this.filterOptions;
    const time = this.filterOptions.time || 2100;
    // Filter points based on type selection.
    const filteredPoints = this.rawPoints.filter((p) => {
      if (!types[p.type]) return false;
      // If the underlying node has yearsActive, ensure it matches time range
      const node = this.nodesById[p.id];
      if (node && node.yearsActive) {
        const [start, end] = parseYearsRange(node.yearsActive);
        if (start && end) {
          return start <= time && end >= time;
        }
      }
      return true;
    });
    // Filter arcs: both endpoints must be visible.
    const filteredIds = new Set(filteredPoints.map((p) => p.id));
    const filteredArcs = this.rawArcs.filter((a) => {
      // Determine if there exists a point with matching coordinates and id.
      const sourceNode = findNodeByCoordinates(a.sourceLat, a.sourceLng, this.rawPoints);
      const targetNode = findNodeByCoordinates(a.targetLat, a.targetLng, this.rawPoints);
      return (
        sourceNode &&
        targetNode &&
        filteredIds.has(sourceNode.id) &&
        filteredIds.has(targetNode.id)
      );
    });
    // Adjust colours for ghost mode.
    const ghostColor = '#999999';
    if (mode === 'ghost') {
      this.globe
        .pointColor((p) => (types[p.type] ? p.color : ghostColor))
        .arcColor(() => ghostColor);
    } else {
      this.globe
        .pointColor((p) => p.color)
        .arcColor((a) => a.color);
    }
    // Apply new datasets. If hide mode is used, filtered-out nodes and links are removed entirely.
    this.globe
      .pointsData(filteredPoints)
      .arcsData(filteredArcs);
  }
}

window.MapView = MapView;

// Helper to parse a yearsActive range. Duplicated from Graph3D for isolation.
function parseYearsRange(rangeStr) {
  if (!rangeStr) return [undefined, undefined];
  const m = rangeStr.match(/(\d{4})\s*–\s*(\d{4}|present)/i);
  if (m) {
    const start = parseInt(m[1], 10);
    let end;
    if (m[2].toLowerCase() === 'present') {
      end = new Date().getFullYear();
    } else {
      end = parseInt(m[2], 10);
    }
    return [start, end];
  }
  return [undefined, undefined];
}

// Find a point object by coordinates. This helper returns the first point
// matching the provided latitude and longitude from the given points array.
function findNodeByCoordinates(lat, lng, points) {
  return points.find((p) => p.lat === lat && p.lng === lng);
}