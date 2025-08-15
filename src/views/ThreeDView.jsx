import { useEffect, useRef } from 'react'
import ForceGraph3D from '3d-force-graph'
import useDataStore from '../store/DataStore'

function ThreeDView() {
  const containerRef = useRef(null)
  const graphRef = useRef(null)
  const initTimeoutRef = useRef(null)
  const holderRef = useRef(null) // inner holder for a fresh canvas per init
  const { nodes, links, setSelectedNode, activeView } = useDataStore()

  useEffect(() => {
    console.log('3D: Component mounted, setting up initialization')
    
    // Clear any existing timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current)
    }

    // Wait a bit for the DOM to be ready, then initialize
    initTimeoutRef.current = setTimeout(() => {
      const hasContainer = !!containerRef.current
      const isActive = activeView === '3d'
      const cw = containerRef.current?.clientWidth ?? 0
      const ch = containerRef.current?.clientHeight ?? 0
      const hasSize = cw > 0 && ch > 0
      if (hasContainer && isActive && hasSize && nodes.length > 0) {
        console.log('3D: Container and data ready, initializing...')
        initializeGraph()
      } else {
        console.log('3D: Still waiting for container or data', {
          hasContainer,
          isActive,
          hasSize,
          size: { width: cw, height: ch },
          nodeCount: nodes.length
        })
      }
    }, 300) // Give it a bit more time

    return () => {
      console.log('3D: Component unmounting, cleaning up')
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current)
      }
      if (graphRef.current) {
        try {
          graphRef.current._destructor?.()
        } catch (e) {
          console.warn('3D: Cleanup error:', e)
        }
        graphRef.current = null
      }
      // Remove any existing holder/canvas to avoid WebGL context reuse
      if (holderRef.current && containerRef.current?.contains(holderRef.current)) {
        try {
          containerRef.current.removeChild(holderRef.current)
        } catch (e) {
          console.warn('3D: Holder removal error:', e)
        }
        holderRef.current = null
      }
    }
  }, [nodes, links, activeView])

  function initializeGraph() {
    if (!containerRef.current) {
      console.error('3D: Container still not available during initialization')
      return
    }

    // Guard: ensure visible size to avoid Three.js initializing with 0-sized canvas
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    if (cw === 0 || ch === 0) {
      console.warn('3D: Container has zero size, aborting init and retrying later', { width: cw, height: ch })
      return
    }

    try {
      console.log('3D: Starting graph initialization')

      // Clean up any existing graph
      if (graphRef.current) {
        graphRef.current._destructor?.()
        graphRef.current = null
      }

      // Clear container and ensure previous holder/canvas are removed
      if (holderRef.current && containerRef.current.contains(holderRef.current)) {
        containerRef.current.removeChild(holderRef.current)
        holderRef.current = null
      }
      containerRef.current.innerHTML = ''

      // Create a fresh inner holder so each init gets a new canvas/context
      const holder = document.createElement('div')
      holder.style.width = '100%'
      holder.style.height = '100%'
      containerRef.current.appendChild(holder)
      holderRef.current = holder

      // Prepare data with explicit structure for Three.js compatibility
      const nodeMap = new Map(nodes.map(node => [node.id, node]))
      
      const graphNodes = nodes.map((node, index) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        val: 1,
        index: index // Add explicit index
      }))

      const validLinks = links
        .filter(link => nodeMap.has(link.source) && nodeMap.has(link.target))
        .map(link => ({
          source: link.source,
          target: link.target,
          type: link.type || 'default',
          value: 1 // Add explicit value
        }))

      const graphData = {
        nodes: graphNodes,
        links: validLinks
      }

      console.log('3D: Prepared data structure:', {
        nodes: graphData.nodes.length,
        links: graphData.links.length,
        sampleNode: graphData.nodes[0],
        sampleLink: graphData.links[0]
      })

      // Validate data before proceeding
      if (graphData.nodes.length === 0) {
        console.warn('3D: No nodes to render')
        return
      }

      console.log('3D: Creating graph with', graphData.nodes.length, 'nodes and', graphData.links.length, 'links')

      // Create graph with minimal configuration first
      const graph = ForceGraph3D()
      
      // Initialize with fresh holder
      graph(holder)

      // Set basic properties
      graph
        .backgroundColor('#0b0d10')
        .showNavInfo(false)
        .nodeLabel('name')
        .linkOpacity(0.4)
        .enableNodeDrag(false) // Disable drag to reduce complexity
        .onNodeClick((node) => {
          const fullNode = nodes.find(n => n.id === node.id)
          if (fullNode) {
            setSelectedNode(fullNode)
            console.log('3D: Selected node', fullNode.name)
          }
        })
        // Use direct color mapping without custom meshes to avoid multiple THREE instances
        .nodeColor(node => {
          const colorMap = {
            band: '#ff6b6b',
            member: '#4ecdc4',
            label: '#45b7d1',
            genre: '#96ceb4',
            venue: '#feca57',
            event: '#ff9ff3'
          }
          return colorMap[node.type] ?? '#cccccc'
        })

      // Set data after configuration
      console.log('3D: Setting graph data...')
      graph.graphData(graphData)
      
      // Node color handled via nodeColor
      console.log('3D: Using nodeColor for stable coloring')

      graphRef.current = graph
      console.log('3D: Graph successfully created!')

    } catch (error) {
      console.error('3D: Failed to create graph:', error)
    }
  }



  return (
    <div 
      ref={containerRef} 
      className="threed-view"
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '400px',
        position: 'relative'
      }}
    />
  )
}

export default ThreeDView
