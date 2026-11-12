# Demo Catalogue

Run `npm ci` and `npm run dev`. Open `http://127.0.0.1:5173/#/ID` using the IDs below. All 46 source OrgChart demo pages have an equivalent scenario. `src/demos.ts` holds the source data/options; `src/App.vue` provides shared executable editing, visibility, source editing, navigation and export controls, avoiding copied boilerplate in 46 components.

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
| `data-prop-compact` | One compact branch |
| `level-offset` | Visual depth offset |
| `nodes-of-different-widths` | 230px / 130px children |
| `responsive-design` | Responsive viewport, pan/zoom/minimap |
| `10000-nodes` | 10,000 loaded nodes, depth 2 initially, expand-all |
| `pan-zoom` | Background pointer pan and wheel zoom |
| `minimap` | Preview drag/click/wheel/keyboard |
| `toggle-sibs-resp` | Independent left/right controls |
| `default-collapsed` | Collapsed branch |
| `expand-to-given-depth` | Numeric depth input |
| `center-on-selected-node` | Selection centers node |
| `filter-node` | Keyword/path filtering |
| `report-path` | Root-to-member record path |
| `get-related-nodes` | Loaded relation visibility |
| `edit-chart` | Add parent/children/siblings, remove/move |
| `edit-hybrid-chart` | Same edits with vertical layout |
| `drag-drop` | Drag criteria and cycle prevention |
| `drag-drop-hybrid-chart` | Drag with vertical branches |
| `get-hierarchy` | Full hierarchy inspector |
| `get-flat-datasource` | Flat export inspector |
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
