# Vue Component API

This is the compact reference for the current Vue component, not a native constructor API. The [developer guide](../README.md#reactive-configuration) documents every prop and exposed method individually, with Vue examples. Configure reactive props, invoke OrgChartInstance through a template ref after mount, customize with slots, and subscribe to Vue emits. `data` takes precedence over non-null `datasource`; either may be null for an empty chart. Vue owns the host.

## Props

Vue templates use kebab-case, for example `:visible-level="2"` or `:export-scale="3"`. `setOptions` uses the camelCase names below.

| Prop | Type | Default / contract |
| --- | --- | --- |
| `data`, `datasource` | object / array / HTMLUListElement / null | Nested tree, flat rows, grouped families or UL; copied on input |
| `nodeId` | string | `id`; required for persistence and stable ID-based editing |
| `nodeTitle` | string | `name`, escaped text |
| `nodeContent` | string | `title`; use `''` for title-only nodes |
| `direction` | string | `t2b`, `b2t`, `l2r`, `r2l` |
| `visibleLevel` | integer / boolean | 999; true = 999, false = 1, zero initially hides all nodes |
| `verticalLevel` | integer >= 2 | None; vertical from this one-based depth |
| `compact` | boolean / `(data) => boolean` | None; explicit data.compact is retained; vertical/hybrid wins |
| `toggleSiblingsResp` | boolean | false; left/right controls act independently when enabled |
| `pan`, `zoom`, `minimap` | boolean | false; minimap wheel zoom is independent of zoom |
| `zoomoutLimit`, `zoominLimit` | finite positive number | 0.5 / 7, inclusive, ordered; invalid values throw RangeError |
| `draggable`, `drag` | boolean | false; draggable wins if explicitly supplied |
| `dropCriteria` | `(draggedElement, parentElementOrNull, targetElement) => boolean` | Optional extra restriction after cycle checks |
| `chartClass` | string | Additional classes on the chart |
| `nodeTemplate` | `(data) => VNode / VNode[] / string` | Prefer VNodes; string HTML must be trusted/sanitized |
| `createNode` | `(element, ownedData) => void` | Called after each node mounts; built-in interaction controls are not prebuilt |
| `initCompleted` | `(chartElement) => void` | Called after mounting and init |
| `icons` | partial object | Optional CSS icon classes; unspecified icons use Lucide |
| `exportButton` | boolean | false |
| `exportButtonName` | string | `Export` |
| `exportFilename` | string | `OrgChart` |
| `exportFileextension` | string | `png` or `pdf` |
| `exportScale` | number | 2; nonfinite/nonpositive values fall back to 1 |

Icons fields: `theme`, `parentNode`, `expandToUp`, `collapseToDown`, `collapseToLeft`, `expandToRight`, `collapsed`, `expanded`. `theme` is a shared CSS class. Supply your own font/icon stylesheet; there is no Font Awesome runtime dependency. Slots can use any Vue icon component.

## Node Fields

All custom serializable fields are copied and retained. `children` is structural. `className`, `collapsed`, `hybrid`, `compact`, `levelOffset`, `width` and `height` control presentation. Width/height are positive pixel dimensions; custom slot content is measured with ResizeObserver. `gender` and `outsider` are application fields shown in family demos. Legacy `className: 'slide-up'` on a child initially collapses that parent's descendants.

Flat sources use `parent_id`. Family flat conversion additionally uses `family_id`. Regular flat sources require exactly one root; multiple root household groups are allowed in grouped families. Input IDs must be nonempty strings or finite numbers. All actual depths are one-based and unaffected by visual `levelOffset`.

## Slots

| Slot | Scope |
| --- | --- |
| `node`, `default` | `{ nodeData, node, selected, expanded, loading }`; node is a data alias |
| `toolbar` | `{ chart, viewport }`; chart is the exposed API |
| `empty` | Custom empty-state content |

Do not mutate slot data to edit structure. Use methods or replace your source. Buttons inside a slot should use `@click.stop` if they should not select the node. The default controls remain around custom content.

## Lifecycle

| Method | Contract |
| --- | --- |
| `init(options = {})` | Applies partial options and resets expansion/selection; returns API. Revives a destroyed instance. Edits remain unless data is replaced. |
| `setOptions(options)` / `setOptions(name, value)` | Validates first and applies override; returns API. Navigation/layout changes preserve owned data, selection, viewport and expansion. visibleLevel changes reset expansion. |
| `destroy()` | Idempotent cleanup; removes chart, aborts loaders, clears gestures/observers/frames. Returns API. Vue unmount calls it automatically. |
| `attachMinimap()` / `detachMinimap()` | Enable/disable overlay via options; returns API. |
| `updateMinimap(forceRefresh = false)` | Synchronously re-reads host bounds/scroll. Preview geometry is reactive, so forceRefresh needs no separate DOM rebuild. |
| `chart`, `chartContainer` | Read-only native element getters; chart is null after destroy. |

Use reactive props for normal Vue configuration. Imperative `setOptions` overrides corresponding props until replaced by another imperative value. Replacing a bound datasource resets loaded structure and pending requests. `v-model` echoes of this component's own snapshot preserve navigation state.

## Editing

Every node argument below accepts an ID, data record with the configured ID, or a rendered `.node` element. Read snapshots synchronously; await Vue's `nextTick()` before querying newly inserted DOM elements. Missing nodes throw an Error. Duplicate edits and invalid moves are rejected before mutation.

| Method | Contract |
| --- | --- |
| `addAncestors(data, parentId)` | Inserts a new ancestor hierarchy and appends the current root groups under the named ancestor. |
| `addDescendants(data, parent)` | Alias for `addChildren(parent, data)`. |
| `addParent(root, data)` | Wraps current root hierarchy; non-root arguments are rejected. New parent requires an ID. |
| `addSiblings(node, data)` | Appends sibling groups. A regular tree root cannot have siblings; add a parent first. |
| `addChildren(node, data)` | Appends child groups and expands the receiving parent. data is an array or grouped family array. |
| `removeNodes(node)` | Removes only selected member and its descendants. Empty root chart invokes destroy. |
| `moveNode(node, target)` | Reparents member and descendants. Rejects regular root, self, current parent, descendant and dropCriteria failures. Emits node-drop. |
| `loadChildren(node, loader)` | `Promise<boolean>`; deduplicates by node, passes `(copiedData, AbortSignal)` to loader. Appends returned array. Aborted/stale/duplicate calls return false; other errors emit load-error and reject. |

Family mutation preserves surrounding spouses. Each member keeps its own child ownership; both spouses can activate a shared child control when only one member owns descendants. `getChildren` itself returns the selected member's children, not its spouse's. Node identity is maintained by keyed Vue rendering except when a new datasource replaces records.

## Queries

| Method | Return value |
| --- | --- |
| `getHierarchy(includeNodeData = false)` | IDs/children snapshot or full copied records. Families retain grouped arrays. Empty chart or missing IDs returns an error string. |
| `getFlatDatasource()` | Fresh depth-first records, recomputed parent_id, no children/level/parentId. Families include generated family_id for this export. Errors match getHierarchy. |
| `getNode(node)` | Current HTMLElement or null. |
| `getParent(node)` | Parent element or null. |
| `getChildren(node)` | Direct child elements including loaded hidden ones. |
| `getSiblings(node)` | All members sharing the same chart parent, excluding selected node. |
| `getRelatedNodes(node, relation)` | parent returns HTMLElement or null; children/siblings return HTMLElement[]. Includes loaded hidden records. |
| `getNodeState(node, relation?)` | `{ exist, visible }`; loaded relation state or selected node state when omitted. visible means any related node is shown. |
| `getPath(node)` | Copied records from root to selected member, inclusive. |

Generated family_id values are not persistent household identifiers. Use `flatToFamily()` to reconstruct grouped data; passing a family flat snapshot directly as ordinary flat data is not supported.

## Visibility And Viewport

| Method | Behavior |
| --- | --- |
| `hideParent(node)` | Hides ancestor cards and sibling households while keeping the chosen descendant path. |
| `showParent(node)` | Restores one parent household without restoring hidden siblings. Call up the path for all ancestors. |
| `hideChildren(node)` / `showChildren(node)` | Collapse loaded descendants and their branches / restore only immediate child groups. Family shared-owner fallback is supported. |
| `hideSiblings(node, direction?)` / `showSiblings(node, direction?)` | Hide/show all other households or only left/right groups, keeping their descendants collapsed. Showing siblings also restores a hidden immediate parent. The selected spouse group remains intact. |
| `expandAll(depth = 999)` / `collapseAll()` | Expand to specified nonnegative integer depth / show first level. Clears sibling/ancestor hiding. |
| `filterNodes(keyword)` / `clearFilter()` | Show matching text records plus ancestor paths and households / restore pre-filter navigation state. |
| `setChartScale(multiplier, anchor?)` | Relative positive multiplier, optional host-local `{x,y}`; bounds inclusive and anchor fixed. |
| `setChartScale(chart, multiplier, anchor?)` | Low-level compatibility calling form; normal Vue code passes only multiplier and optional anchor. |
| `getViewport()` | Fresh `{x,y,scale}` snapshot. |
| `centerOnNode(node)` | Reveals hidden ancestors and centers after Vue layout updates. |
| `resetView()` | Resets translation, scroll and scale 1 clamped within limits. |

Pointer pan starts only on chart background. Wheel zoom cancels browser scrolling only when enabled. Pinch uses the two-pointer midpoint. Touch drag starts after a 350ms hold; movement cancels the hold. Minimap supports pointer click/drag, wheel, and arrow keys. CSS `--oc-duration` controls transitions; reduced motion disables animations without blocking state changes.

Relationship transitions follow the native demo: ancestors fade toward their children, descendants toward their parent, and siblings toward the selected household. The reverse transition restores each group. Default timing is 300ms with CSS ease; `--oc-slide-x` and `--oc-slide-y` default to 130px and 40px. Ordinary parent/child connectors disappear at collapse start; outgoing cards retain their geometry until the exit finishes, then layout reflows.

## Export

`export(filename = 'OrgChart', extension = 'png')` returns a Promise resolving to the rendered HTMLCanvasElement after download, or false when empty/busy/destroyed. It captures full logical dimensions of currently visible layout, omits controls and removes pan/zoom transforms from its cloned chart. Non-CORS images may fail; failures emit export-error, dispatch the native event and reject. Both success and failure clear the overlay. `html2canvas` and `jsPDF` are dynamic imports.

`exportPNG(canvas, filename = 'OrgChart')` encodes/downloads PNG and revokes the generated object URL. `exportPDF(canvas, filename = 'OrgChart', exportScale = 1)` downloads a logical-size PDF; scale converts pixel resolution back to page dimensions. Both return `Promise<void>` and operate on an existing canvas without the component's capture, busy mask or export events. Catch their errors separately. Extremely large canvases/PDF pages remain constrained by browser and jsPDF limits. Do not export all 10,000 nodes as one unlimited image.

## Events

| Event | Payload |
| --- | --- |
| `node-click`, `select` | Copied node record |
| `deselect` | No payload; a canvas background click or Escape clears the selection |
| `change`, `update:data`, `update:datasource` | Full copied hierarchy after an edit, or null when root removed |
| `init` | Native chart element |
| `show`, `hide` | `{ node, relation }` |
| `node-drop` | `{ draggedNode, dropZone }` records |
| `load` | `{ node, data }` |
| `load-error` | `{ node, error }` |
| `zoom`, `pan` | `{ x, y, scale }` |
| `export` | `{ canvas, filename, extension }` |
| `export-error` | `{ error }` |

These are Vue component emits with direct payloads, not browser CustomEvent objects. node-drop is a post-move notification; use dropCriteria rather than preventDefault to restrict moves. Low-level DOM notifications are not a substitute for this Vue event contract.

## Styling And Helpers

Override `--oc-node-width`, `--oc-row-height`, `--oc-line-color`, `--oc-hover-color`, `--oc-control-color`, `--oc-control-hover-color`, `--oc-duration` on `.oc-shell` or `.orgchart`. The node layer has `.node`, `.title`, `.content`, `.focused`, `.matched`, `.oc-drop-target` and `data-parent` / `data-level` / `data-layout` attributes. Give the component a CSS height for its scroll viewport.

`flatToTree(rows, nodeId = 'id')`, `ulToTree(element, nodeId = 'id')` and `flatToFamily(rows, nodeId = 'id')` are exported normalization helpers. They do not change their source. Input data should be structured-clone-compatible JSON-like records; Vue proxies are unwrapped before copying. Functions belong in options, not data fields.
