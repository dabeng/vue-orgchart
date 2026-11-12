# Native OrgChart Parity

The reference is the local/native OrgChart public API and demo catalogue, including its flat records, grouped families, compact layout and minimap additions. This implementation is Vue-owned data/rendering, not a native OrgChart wrapper. Internal DOM nesting and private methods are intentionally not ported. Native public options and methods are enumerated in [API](api.md); every original demo ID is checked in `test/demos.test.ts`.

| Native feature | Vue implementation | Verification |
| --- | --- | --- |
| JSON/local/remote/UL/flat sources | ChartModel, flatToTree, ulToTree, application fetch | tree, demos, browser loads |
| Grouped family source and custom ids | Household arrays, member-owned children, flatToFamily | tree, layout, component, family E2E |
| Four directions and variable widths | layoutChart + d3-flextree + ResizeObserver | layout nonoverlap, all-demo E2E |
| verticalLevel, hybrid, compact callback/data | Layout mode precedence and subblocks | layout, demo combinations |
| levelOffset | Visual offset with real depth preserved | layout, level-offset demo |
| Initial collapse and visibleLevel | Explicit Vue defaults, collapsed set, slide-up compatibility | component depth matrix |
| Parent/child/sibling navigation | Visibility state, shared household owner, transitions | component, family E2E |
| toggleSiblingsResp | Side-specific household visibility | component, demo E2E |
| Editing and root removal | Atomic model validation, keyed nodes, lifecycle cleanup | tree, component, navigation, editing E2E |
| Drag/drop and dropCriteria | Native HTML drag, touch hold, moveNode cycle checks | tree, component, navigation, desktop drag E2E |
| Pan/zoom/minimap | Pointer/pinch/wheel, clamp/anchor, reactive preview | navigation, component, browser wheel |
| getHierarchy/getFlatDatasource | Full loaded snapshots, family_id generation | tree roundtrips, inspector E2E |
| Relation queries and getNodeState | Model relations mapped to current native elements | component, related-nodes demo |
| init/setOptions/destroy | Typed exposed API, reactive props, abort/observer cleanup | component, useChart, navigation |
| createNode/nodeTemplate/icons | Callback, trusted HTML/VNodes/slots, partial icon classes | component, templates/icons demos |
| PNG/PDF and portrait export | Lazy html2canvas/jsPDF, logical PDF dimensions | export unit tests, actual browser downloads |
| Report path, filtering, center, expand depth | Exposed Vue conveniences + workbench | component/navigation, browser filtering |
| Geographic integration | Lazy OpenLayers + local vector layer | nonblank canvas/selection browser check |
| 10,000-node example | Complete loaded model, depth-limited initial rendering | model/layout scale tests, browser node count |
| Keyboard/touch/reduced motion | Focus controls, inert hidden nodes, Pointer Events | component/navigation, family browser checks |

## Deliberate Differences

Vue lifecycle replaces the constructor's container selector. Node arguments additionally accept IDs/data. Slots and VNodes are preferred over imperative DOM templates. The default Vue content field remains `title`, unlike the native title-only default. Configuration preserves loaded edits without DOM rebuilds; DOM queries must follow `nextTick` after structural updates. Export helpers are promises and dynamically import their adapters instead of requiring global scripts. Family flat conversion is exported as a helper rather than copied into one demo. The 10,000-node scenario does not claim a universal 500ms limit.

Keyboard, pointer, export and browser tests exercise the public behavior; the original repository's private DOM-specific tests are not copied verbatim because that DOM tree no longer exists. Current browser gates target Chromium desktop/mobile, not every browser engine.
