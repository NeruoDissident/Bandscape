// main.js
// Entry point: initialise the graph and map views, set up UI bindings,
// implement search functionality and synchronise state across views.

function initializeApp() {
  // Ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
    return;
  }
  
  // Main application logic
  // Mark as initialized to prevent double initialization
  window.appInitialized = true;
  
  // Resolve the data: it may be defined as `window.data` or as
  // `window.nodes` and `window.edges` for backwards compatibility.
  const data = window.data
    ? window.data
    : { nodes: window.nodes || [], edges: window.edges || [] };
  // Create the graph and map views. They will stay in sync via callbacks.
  const graphView = new Graph3D(data, 'graph3d-container', onSelectNode);
  const mapView = new MapView(data, 'globe-container', onSelectNode);
  let currentView = 'graph';

  // Handle view toggling between graph and globe.
  const toggleBtn = document.getElementById('toggle-view');
  toggleBtn.addEventListener('click', () => {
    if (currentView === 'graph') {
      currentView = 'globe';
      document.getElementById('graph3d-container').style.display = 'none';
      document.getElementById('globe-container').style.display = '';
      toggleBtn.textContent = 'Graph';
    } else {
      currentView = 'graph';
      document.getElementById('graph3d-container').style.display = '';
      document.getElementById('globe-container').style.display = 'none';
      toggleBtn.textContent = 'Globe';
    }
  });

  // Update filters whenever checkboxes or mode select change.
  const filterControls = [
    'filter-band',
    'filter-member',
    'filter-producer',
    'filter-label',
    'filter-venue',
    'filter-event',
    'filter-family',
    'modeSelect',
    'timeRange'
  ];
  filterControls.forEach((id) => {
    document.getElementById(id).addEventListener('change', applyFilters);
  });

  function applyFilters() {
    const types = {
      band: document.getElementById('filter-band').checked,
      member: document.getElementById('filter-member').checked,
      producer: document.getElementById('filter-producer').checked,
      label: document.getElementById('filter-label').checked,
      venue: document.getElementById('filter-venue').checked,
      event: document.getElementById('filter-event').checked,
      family: document.getElementById('filter-family').checked
    };
    const mode = document.getElementById('modeSelect').value;
    const time = parseInt(document.getElementById('timeRange').value, 10);
    const filterOpts = { types, mode, time };
    graphView.updateFilters(filterOpts);
    mapView.updateFilters(filterOpts);
  }

  // Search functionality: fuzzy match across names and aliases using Fuse.js.
  const fuse = new Fuse(data.nodes, {
    keys: ['name', 'aliases'],
    includeScore: true,
    threshold: 0.4
  });
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('keyup', (e) => {
    const query = e.target.value.trim();
    if (!query) return;
    const results = fuse.search(query);
    if (results.length > 0) {
      const id = results[0].item.id;
      onSelectNode(id);
    }
  });

  // Node selection logic: highlight nodes across both views and populate sidebar.
  function onSelectNode(nodeId) {
    graphView.selectNode(nodeId);
    mapView.highlightNode(nodeId);
    populateSidebar(nodeId);
  }

  // Populate the sidebar with details for the selected node.
  function populateSidebar(id) {
    const node = data.nodes.find((n) => n.id === id);
    const sidebar = document.getElementById('sidebar');
    if (!node) {
      sidebar.style.display = 'none';
      return;
    }
    sidebar.innerHTML = '';
    sidebar.style.display = 'block';
    const title = document.createElement('h2');
    title.textContent = node.name;
    sidebar.appendChild(title);
    const details = document.createElement('p');
    details.innerHTML = `<strong>Type:</strong> ${node.type}<br/>
      <strong>Years Active:</strong> ${node.yearsActive || ''}<br/>
      <strong>Genres:</strong> ${(node.genres || []).join(', ')}<br/>
      <strong>Aliases:</strong> ${(node.aliases || []).join(', ')}`;
    sidebar.appendChild(details);
    const connectionsTitle = document.createElement('h3');
    connectionsTitle.textContent = 'Connections';
    sidebar.appendChild(connectionsTitle);
    const list = document.createElement('ul');
    // Show edges connected to this node.
    data.edges
      .filter((e) => e.source === id || e.target === id)
      .forEach((e) => {
        const otherId = e.source === id ? e.target : e.source;
        const otherNode = data.nodes.find((n) => n.id === otherId);
        if (!otherNode) return;
        const li = document.createElement('li');
        li.style.cursor = 'pointer';
        li.textContent = `${otherNode.name} (${e.role || ''} ${e.years || ''})`;
        li.addEventListener('click', () => {
          onSelectNode(otherId);
        });
        list.appendChild(li);
      });
    sidebar.appendChild(list);
  }

  // Persist and restore views. Save the current filters, selected node, and camera position.
  document.getElementById('saveView').addEventListener('click', () => {
    const view = {
      filters: {
        types: {
          band: document.getElementById('filter-band').checked,
          member: document.getElementById('filter-member').checked,
          producer: document.getElementById('filter-producer').checked,
          label: document.getElementById('filter-label').checked,
          venue: document.getElementById('filter-venue').checked,
          event: document.getElementById('filter-event').checked,
          family: document.getElementById('filter-family').checked
        },
        mode: document.getElementById('modeSelect').value,
        time: parseInt(document.getElementById('timeRange').value, 10)
      },
      selected: graphView.selectedNodeId,
      isGlobe: currentView === 'globe'
    };
    localStorage.setItem('savedView', JSON.stringify(view));
    alert('View saved!');
  });
  document.getElementById('loadView').addEventListener('click', () => {
    const saved = localStorage.getItem('savedView');
    if (!saved) {
      alert('No saved view');
      return;
    }
    const view = JSON.parse(saved);
    // Restore filters
    const f = view.filters;
    document.getElementById('filter-band').checked = f.types.band;
    document.getElementById('filter-member').checked = f.types.member;
    document.getElementById('filter-producer').checked = f.types.producer;
    document.getElementById('filter-label').checked = f.types.label;
    document.getElementById('filter-venue').checked = f.types.venue;
    document.getElementById('filter-event').checked = f.types.event;
    document.getElementById('filter-family').checked = f.types.family;
    document.getElementById('modeSelect').value = f.mode;
    document.getElementById('timeRange').value = f.time;
    applyFilters();
    // Restore selection
    if (view.selected) {
      onSelectNode(view.selected);
    }
    // Restore view (graph or globe)
    if (view.isGlobe && currentView !== 'globe') {
      toggleBtn.click();
    } else if (!view.isGlobe && currentView !== 'graph') {
      toggleBtn.click();
    }
  });

  // Export current view as PNG (graph only). Captures the canvas image and triggers a download.
  document.getElementById('exportPNG').addEventListener('click', () => {
    // Determine which view is active.
    let canvas;
    if (currentView === 'graph') {
      // In ForceGraph3D v1, the renderer is accessible via .renderer() and scene via .scene().
      const renderer = graphView.graph.renderer();
      canvas = renderer.domElement;
    } else {
      // Use the globe renderer
      const renderer = mapView.globe.renderer();
      canvas = renderer.domElement;
    }
    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'graph.png';
    a.click();
  });
  // Export visible data as JSON. Includes currently visible nodes and edges.
  document.getElementById('exportJSON').addEventListener('click', () => {
    // Build list of visible nodes based on current filters.
    const types = {
      band: document.getElementById('filter-band').checked,
      member: document.getElementById('filter-member').checked,
      producer: document.getElementById('filter-producer').checked,
      label: document.getElementById('filter-label').checked,
      venue: document.getElementById('filter-venue').checked,
      event: document.getElementById('filter-event').checked,
      family: document.getElementById('filter-family').checked
    };
    const time = parseInt(document.getElementById('timeRange').value, 10);
    const visibleNodes = data.nodes.filter((n) => {
      if (!types[n.type]) return false;
      if (n.yearsActive) {
        const [start, end] = parseYearsRange(n.yearsActive);
        if (start && end) {
          return start <= time && end >= time;
        }
      }
      return true;
    });
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = data.edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
    );
    const json = JSON.stringify({ nodes: visibleNodes, edges: visibleEdges }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Apply initial filters once the page loads.
  applyFilters();
}

// Fallback: if data.js doesn't call initializeApp(), call it on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  // Only initialize if not already done
  if (!window.appInitialized) {
    initializeApp();
  }
});