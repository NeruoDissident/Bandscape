# Band‑Member & Entity Relationship Visualizer

This project visualizes relationships between bands, members, producers, labels, venues, events and family connections in a 3D force‑directed graph and a 3D globe. It is entirely client‑side and can be hosted on any static web server.

## Features

- **3D Graph View** powered by [3d‑force‑graph](https://github.com/vasturiano/3d-force-graph)
  - Interactive nodes and links
  - Filtering by entity type (band, member, producer, label, venue, event, family)
  - Ghost and hide modes for filtered items
  - Time slider to focus on a specific year
  - Selection highlighting and sidebar with details
  - Saving/loading of views via localStorage
  - Export to PNG and JSON
- **3D Globe View** powered by [three‑globe](https://github.com/vasturiano/three-globe)
  - Geographic plotting of nodes by latitude/longitude
  - Arcs drawn between connected entities
  - Filtering and highlighting synchronized with the 3D graph
- **Fuzzy Search** using [Fuse.js](https://fusejs.io/) to quickly find entities by name or alias

## Running the Project Locally

1. **Extract the zip** into a directory of your choice.
2. **Serve the files over HTTP.** Browsers block ES modules and WebGL assets when loaded via the `file://` protocol. You can start a simple server with Python:

   ```bash
   cd path/to/extracted/folder
   python -m http.server 8000
   ```

   or, if you have Node.js installed:

   ```bash
   npx serve .
   ```

3. **Open your browser** to `http://localhost:8000/index.html`. The app defaults to the 3D graph view. Use the **Globe** button to toggle to the globe.

## Updating the Data

Data lives in `data.js`. Replace the placeholder dataset with your enriched data from Phase 1. The script must either set `window.data` to an object containing `nodes` and `edges`, or define `window.nodes` and `window.edges` separately. Each node should include an `id`, `type` and `name`. For proper globes and time filtering, supply `location` (`lat` and `lon`) and `yearsActive` formatted as `"YYYY–YYYY"` or `"YYYY–present"`. The application initialises automatically when `main.js` loads, so ensure `data.js` is included before `main.js` in `index.html`.

## Adding New Entity Types

To add more entity types in the future, extend the `types` objects in `graph3D.js` and `mapView.js`, and add corresponding colour or shape mappings. Update the control panel in `index.html` to include a new checkbox for the entity type. The filtering and sidebar will adapt automatically as long as your nodes include relevant fields.

## Known Limitations

- The time slider filters entities based on the `yearsActive` string; it assumes the format “YYYY–YYYY” or “YYYY–present”.
- The project does not implement advanced clustering, heatmaps, comparison mode, or AI insights. These would require significant additional work and are left for future development.
- Exporting to SVG is not supported in this version. PNG export captures the current canvas. JSON export includes only visible nodes and edges.
- Lazy loading and large‑scale performance optimisations are not implemented; very large datasets may impact performance.

## License

This project is provided as‑is for demonstration purposes. You may modify and redistribute it under the terms of your choice.
