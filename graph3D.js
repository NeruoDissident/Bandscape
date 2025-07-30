// Graph3D.js
// This module wraps the 3d-force-graph library to create a force-directed
// graph that supports basic filtering, highlighting and selection.

class Graph3D {
  /**
   * Construct a new Graph3D instance.
   * @param {Object} data Graph data with `nodes` and `edges` arrays. Nodes must include id, type, name, etc.
   * @param {string} containerId ID of the HTML element to render into.
   * @param {Function} onSelect Callback invoked when a node is selected; receives node id.
   */
  constructor(data, containerId, onSelect) {
    this.container = document.getElementById(containerId);
    this.onSelect = onSelect;
    // Clone raw data to avoid mutating the original objects.
    this.rawNodes = (data.nodes || []).map((n) => ({ ...n }));
    this.rawLinks = (data.edges || []).map((e) => ({
      source: e.source,
      target: e.target,
      role: e.role || '',
      years: e.years || ''
    }));
    // Initialize filter settings.
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
      mode: 'normal' // normal | ghost | hide
      ,
      time: 2025
    };
    this.selectedNodeId = null;
    // Initialize the 3D force graph.
    this.graph = ForceGraph3D()(this.container)
      .graphData({ nodes: this.rawNodes, links: this.rawLinks })
      .nodeId('id')
      .nodeLabel((n) => n.name || n.id)
      .nodeAutoColorBy('type')
      .linkWidth(1)
      .linkOpacity(0.5)
      .onNodeClick((node) => {
        // When a node is clicked, update selection and notify callback.
        this.selectNode(node.id);
        if (typeof this.onSelect === 'function') {
          this.onSelect(node.id);
        }
      });
    // Apply initial filters and highlight state.
    this.applyFilters();
  }

  /**
   * Update the current selection and refresh the graph colours.
   * @param {string|null} id The id of the node to highlight, or null to clear selection.
   */
  selectNode(id) {
    this.selectedNodeId = id;
    this.applyFilters();
  }

  /**
   * Merge the provided filter options with the existing ones and reapply filters.
   * @param {Object} newFilters An object containing updated `types` or `mode` values.
   */
  updateFilters(newFilters) {
    this.filterOptions = Object.assign({}, this.filterOptions, newFilters);
    this.applyFilters();
  }

  /**
   * Compute the filtered set of nodes and links based on selected types and mode,
   * and update the graph. Also update node and link colours/sizes to reflect
   * highlight and ghost/hide modes.
   */
  applyFilters() {
    const { types, mode } = this.filterOptions;
    const time = this.filterOptions.time || 2100;
    // Determine which nodes should be visible based on type filters.
    const visibleNodes = this.rawNodes.filter((n) => {
      // Filter by type
      if (!types[n.type]) return false;
      // Filter by time range if yearsActive is defined
      if (n.yearsActive) {
        const [start, end] = parseYearsRange(n.yearsActive);
        if (start && end) {
          return start <= time && end >= time;
        }
      }
      return true;
    });
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    // Determine which links should be visible: both endpoints must be visible.
    const visibleLinks = this.rawLinks.filter(
      (l) => visibleIds.has(l.source) && visibleIds.has(l.target)
    );
    // If hide mode, physically remove filtered-out nodes and links from the graph.
    let nodesForGraph = visibleNodes;
    let linksForGraph = visibleLinks;
    if (mode === 'hide') {
      // Already removed filtered nodes/links above.
    }
    // Apply ghost mode by altering colours rather than removing items.
    const highlightId = this.selectedNodeId;
    // Assign node and link styles based on state. We reconfigure dynamic
    // functions on the ForceGraph3D instance.
    this.graph
      .nodeColor((node) => {
        // If the node is filtered out (ghost mode only), colour it grey.
        if (!types[node.type]) {
          return mode === 'ghost' ? '#cccccc' : '#000000';
        }
        // Highlight selected node.
        if (highlightId && node.id === highlightId) {
          return '#e74c3c';
        }
        // Default colours based on type.
        switch (node.type) {
          case 'band':
            return '#f39c12';
          case 'member':
            return '#3498db';
          case 'producer':
            return '#9b59b6';
          case 'label':
            return '#1abc9c';
          case 'venue':
            return '#e67e22';
          case 'event':
            return '#e74c3c';
          case 'family':
            return '#95a5a6';
          default:
            return '#7f8c8d';
        }
      })
      .linkColor((link) => {
        if (!types[link.source.type] || !types[link.target.type]) {
          return mode === 'ghost' ? '#dddddd' : '#000000';
        }
        if (highlightId && (link.source.id === highlightId || link.target.id === highlightId)) {
          return '#e74c3c';
        }
        return '#999999';
      })
      .linkWidth((link) => {
        // Thicker lines for highlighted connections.
        if (highlightId && (link.source.id === highlightId || link.target.id === highlightId)) {
          return 2;
        }
        return 1;
      });
    // Update the graph data. This call triggers a re-render and will animate
    // nodes back into view if they were previously filtered out.
    this.graph.graphData({ nodes: nodesForGraph, links: linksForGraph });
  }
}

// Expose Graph3D globally so main.js can instantiate it.
window.Graph3D = Graph3D;

/**
 * Helper to parse a yearsActive string in the form "YYYY–YYYY" or "YYYY–present".
 * Returns an array [startYear, endYear] where either may be undefined if parsing fails.
 */
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