# Demo Catalogue

Run `npm ci` and `npm run dev`. Open `http://127.0.0.1:5173/#/ID` using the IDs below. All 46 source OrgChart demo pages have an equivalent scenario.

The demo application lives in [src/demo](../src/demo/), separate from the published chart library in [src/components](../src/components/):

- [main.js](../src/demo/main.js), [App.vue](../src/demo/App.vue), and [app.css](../src/demo/app.css) provide the demo entry, shared workbench, and styles.
- [demos.ts](../src/demo/demos.ts) defines the route catalogue, datasets, and chart options.
- [demo-source.ts](../src/demo/demo-source.ts) generates copyable examples. It shares [demo-highlights.ts](../src/demo/demo-highlights.ts), [compact.css](../src/demo/compact.css), and [GeoMap.vue](../src/demo/GeoMap.vue) with the live demos.

| Original page / route ID | Vue scenario |
| --- | --- |
| `local-datasource` | Nested JSON |
| `flat-datasource` | Unordered parent_id records |
| `ul-datasource` | HTMLUListElement normalization |
| `ajax-datasource` | Local fetch fixture, error/abort handling |
| `ondemand-loading-data` | Cancellable child loads and ancestor insertion |
| `reload-data` | Reload button and JSON source replacement |
| `bottom2top` | b2t direction |
| `left2right` | l2r direction |
| `right2left` | r2l direction |
| `vertical-level` | verticalLevel 2 |
| `data-prop-hybrid` | One hybrid branch |
| `data-prop-compact` | Native two- and three-column branch grids, including nested and callback-selected branches |
| `level-offset` | Visual depth offset |
| `nodes-of-different-widths` | 230px / 130px children |
| `responsive-design` | Original 17-node tree; vertical branches at viewport widths up to 576px, horizontal hierarchy above that |
| `10000-nodes` | All 10,000 nodes rendered on load: 99 branches with 100 vertically stacked leaves each, with console timings |
| `pan-zoom` | Background pointer pan and wheel zoom |
| `minimap` | Preview drag/click/wheel/keyboard |
| `toggle-sibs-resp` | Independent left/right controls |
| `default-collapsed` | Collapsed branch |
| `expand-to-given-depth` | Numeric depth input |
| `center-on-selected-node` | Selection centers node |
| `filter-node` | Keyword/path filtering |
| `report-path` | Draw and clear the reporting chain on the chart |
| `get-related-nodes` | Highlight parent, children and siblings with a matching legend |
| `edit-chart` | Add a parent or batch-add children and siblings; remove or move nodes |
| `edit-hybrid-chart` | Same batch editing with vertical branches |
| `drag-drop` | Drag criteria and cycle prevention |
| `drag-drop-hybrid-chart` | Drag with vertical branches |
| `get-hierarchy` | Export hierarchy button opens nested JSON output |
| `get-flat-datasource` | Export flat datasource button opens flat JSON records |
| `color-coded` | Branch classes and CSS palette |
| `option-createNode` | DOM callback adds ID tags |
| `custom-template` | Vue VNode template with portraits/mail links |
| `custom-icons` | External-style icon class customization |
| `export-chart` | Real PNG download |
| `export-chart-pdf` | Real PDF download |
| `export-chart-with-pictures` | Local CORS-safe portrait export |
| `family-tree` | Original grouped family fixture |
| `family-tree-with-flat-datasource` | family_id rows roundtrip |
| `familytree-custom-properties` | Gender and outsider tags |
| `integrate-map` | OpenLayers selection/camera, local continent layer |
| `options-compact-drag` | Callback compact + drag + minimap |
| `options-export-navigation` | Export + pan/zoom/minimap |
| `options-horizontal-template` | Horizontal VNode template |
| `options-hybrid-navigation` | Vertical + navigation/minimap |

Family and export portraits are copied from the original repository into `public/avatar/`. JSON fixtures and schematic map geometry live in `public/data/`. There are no third-party image/tile requests. Use hash routes when serving `demo-dist/`; historical native `.html` paths require the server's SPA fallback. Test commands and limitations are described in [Testing](../docs/testing.md).
