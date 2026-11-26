# Vue OrgChart

[简体中文](README.zh-cn.md) · [繁體中文](README.zh-tw.md) · [API](docs/api.md) · [Demos](demo/README.md) · [Migration](docs/migration.md) · [Testing](docs/testing.md)

Vue 3 organization charts and grouped family trees, rebuilt against the native [OrgChart](https://github.com/dabeng/OrgChart) implementation. No jQuery, DOM-owned data, or Vue 2 runtime. Vite, TypeScript, Composition API and ESM/CJS library builds are included.

## Contents

- [Usage](#usage)
- [Reactive Configuration](#reactive-configuration)
- [Datasource And Data Props](#datasource-and-data-props)
- [Props](#props)
- [Component Ref Methods](#component-ref-methods)
- [Events And v-model](#events-and-v-model)
- [Slots](#slots)
- [Styling](#styling)
- [Data Helpers And Types](#data-helpers-and-types)

## Features

- Nested JSON, unordered flat `parent_id` records, nested UL elements and grouped family arrays.
- Four directions; vertical, hybrid, compact and callback-selected compact layouts; variable node sizes and level offsets. Standard sibling packing uses `d3-flextree`.
- Animated parent/child/sibling navigation, independently toggled sibling sides, initial depth and collapsed branches.
- Immutable input, reactive props, `v-model:data`, ancestor/descendant insertion, editing, cycle-safe drag/drop and JSON/flat snapshots.
- Pointer pan, wheel and two-finger zoom, touch-hold drag, inclusive zoom limits and interactive minimap.
- Vue slots/VNodes, trusted HTML templates, `createNode`, custom icons, field names and CSS variables.
- Lazy-loaded PNG/PDF export, local portrait assets and OpenLayers geographic demo.
- Keyboard focus, Enter/Space controls, arrow navigation, hidden-node inertness and reduced-motion support.
- All 46 original demo scenarios, data/model/component/export tests, and desktop/mobile Playwright suites.

## Local Development

Requires Node **22.12+ or 24+**, npm and a modern browser. Node 24 is used by CI.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`. Each example is a hash route, for example `/#/family-tree`, `/#/edit-chart` or `/#/10000-nodes`. The first screen is the interactive workbench. Its JSON editor, editing controls, layout controls, snapshots and export work across examples. Remote demos fetch repository-owned JSON fixtures, not third-party services.

## Usage

Build this checkout with `npm run build-component`, then use its package exports. Version 2.0.0 in this checkout has not been published by this change; npm installations resolve whatever version the registry currently provides.

```vue
<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import OrgChart, { type OrgNode, type OrgChartInstance } from 'vue-organization-chart'
import 'vue-organization-chart/style.css'

const chart = useTemplateRef<OrgChartInstance>('chart')
const data = shallowRef<OrgNode>({
  id: 'ceo', name: 'Alice', title: 'CEO',
  children: [{ id: 'engineering', name: 'Bob', title: 'Engineering' }],
})
function append() {
  chart.value?.addChildren('engineering', [{ id: 'design', name: 'Claire', title: 'Design' }])
}
</script>

<template>
  <OrgChart ref="chart" v-model:data="data" pan zoom minimap draggable />
  <button @click="append">Add employee</button>
</template>
```

Global registration is also supported: `app.use(OrgChart)`. Existing `:datasource` and `@node-click` usage remains supported. Importing the component does not install Vue globally; Vue is a peer dependency.

### Custom Nodes

```vue
<OrgChart :data="data">
  <template #node="{ nodeData, selected, expanded, loading }">
    <strong>{{ nodeData.name }}</strong>
    <small>{{ nodeData.title }}</small>
  </template>
</OrgChart>
```

The default slot has the same props. Prefer slots or VNodes. A string returned by `nodeTemplate` is rendered as trusted HTML: sanitize untrusted values before returning it. Default title/content values are escaped text.

### Flat Records And Families

```ts
const rows = [
  { id: 2, parent_id: 0, name: 'Engineering' },
  { id: 0, parent_id: null, name: 'Company' },
]
const family = [[
  { id: 'mother', name: 'Mother', children: [[{ id: 'child', name: 'Child' }]] },
  { id: 'father', name: 'Father', outsider: true },
]]
```

Flat sources require one root. Numeric/string ID forms match; zero is valid. Invalid IDs, duplicate IDs, missing parents and cycles throw before replacement. Family arrays preserve households and their owning parent's descendants. `flatToFamily(rows, nodeId)` converts rows with `family_id`; plain `parent_id` cannot encode spouse relationships. Sources are copied; save edits using `getHierarchy(true)` or `getFlatDatasource()`.

### Remote And On-demand Data

Fetch remote JSON in the application and bind it to `data`. For cancellable, deduplicated child requests:

```ts
await chart.value?.loadChildren('engineering', async (node, signal) => {
  const response = await fetch(`/api/children/${node.id}`, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
})
```

No relationship metadata is required. Controls describe loaded relations. Errors emit `load-error` and reject; retry is application-owned. Removing nodes, replacing data or unmounting aborts pending loads.

## Reactive Configuration

`OrgChart` is a Vue component. Configure it with props, access commands through a template ref, customize rendering with slots, and subscribe with Vue event listeners. There is no constructor to call and no container selector to configure. The reference below describes the interface actually exposed by this Vue implementation.

```vue
<script setup lang="ts">
import { reactive, shallowRef, useTemplateRef } from 'vue'
import OrgChart, { type ChartOptions, type OrgChartInstance, type OrgNode } from 'vue-organization-chart'
import 'vue-organization-chart/style.css'

const chart = useTemplateRef<OrgChartInstance>('chart')
const data = shallowRef<OrgNode>({ id: 'company', name: 'Company',
  children: [{ id: 'engineering', name: 'Engineering' }] })
const options = reactive<ChartOptions>({ direction: 't2b', visibleLevel: 2, pan: true })

function addTeam() {
  chart.value?.addChildren('engineering', [{ id: 'platform', name: 'Platform' }])
}
function onDrop(payload: { draggedNode: OrgNode; dropZone: OrgNode }) {
  console.log(payload.draggedNode.id, payload.dropZone.id)
}
</script>

<template>
  <OrgChart ref="chart" v-model:data="data" v-bind="options" @node-drop="onDrop" />
  <button @click="options.direction = 'l2r'">Horizontal layout</button>
  <button @click="addTeam">Add team</button>
</template>
```

The ref is null before mounting and after unmounting. Use it in event handlers, `onMounted`, or after a rendering tick, not at the top level of setup. Prefer reactive props for application settings. Imperative `setOptions` is an alternative, not a second configuration source to mix casually with props: its values override matching props until another imperative value replaces them.

### Datasource And Data Props

`data` accepts a nested object, unordered flat records, a nested `HTMLUListElement`, grouped family arrays, an empty array, or `null`. `datasource` is the compatibility alias; non-null `data` takes precedence. Records and child arrays are copied. The original source is not an edit buffer: persist `getHierarchy(true)`, `getFlatDatasource()`, or emitted snapshots instead.

```ts
const nested = {
  id: 'company', name: 'Company', title: 'Head office',
  children: [
    { id: 'engineering', name: 'Engineering', collapsed: true,
      children: [{ id: 'design', name: 'Design' }] },
    { id: 'sales', name: 'Sales', className: 'sales-team' },
  ],
}
```

| Field | Type | Required / default | Contract |
| --- | --- | --- | --- |
| Configured `nodeId` field | string or finite number | Required for ID-based editing and persistence | Nonempty, unique; numeric/string forms of an ID match; zero is valid. |
| Configured `nodeTitle` field | display value | Optional; `name` | Escaped title text in the default template. |
| Configured `nodeContent` field | display value | Optional; `title` | Escaped content text; omitted when missing or nodeContent is empty. |
| `children` | record array or household array | Optional | Nested child groups; derived internally from parent_id for flat input. |
| `parent_id` | string / number / null | Flat records only | Null or omitted identifies the single root; input order is retained among siblings. |
| `family_id` | string / number | Flat-family conversion only | `flatToFamily()` groups spouses before rendering; plain flat input does not infer households. |
| `collapsed` | boolean | false | Initially hides this node's children. |
| `className` | string | Empty | Node CSS classes; legacy child `slide-up` initially collapses its parent. |
| `hybrid` | truthy value | Unset | Uses vertical branch layout; takes precedence over compact. |
| `compact` | truthy value | Unset | Compacts this branch and descendants unless vertical/hybrid applies. |
| `levelOffset` | number | 0 | Visual depth offset, without changing actual parentage or one-based depth. |
| `width`, `height` | positive number | Measured/default node size | Pixel geometry; ResizeObserver also measures custom content. |
| Other serializable fields | JSON-like values | Optional | Retained for slots, callbacks, snapshots and application metadata, including gender/outsider. |

Flat arrays require exactly one root when nonempty. Duplicate/invalid IDs, missing parents and cycles throw before replacing data. Family arrays allow multiple root households; spouses remain separate members and retain their own descendants. ID-less nested data can render, but hierarchy/flat persistence requires IDs on every node. The removed native relationship metadata and preprocessing method are not reintroduced.

### Props

The `ChartOptions` type defines the component's props. Use kebab-case in templates (`:visible-level="2"`) and camelCase in an options object (`v-bind="options"`). No prop is required for an empty chart; provide data or datasource to render nodes. A default marked unset means undefined.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | object / array / HTMLUListElement / null | Supply data or datasource for a nonempty chart | null | Nested, flat, UL or grouped-family source. |
| `datasource` | Same as data | No | null | Vue compatibility alias. |
| `pan` | boolean | No | false | Drag chart background to pan; does not intercept node controls. |
| `zoom` | boolean | No | false | Wheel and two-finger pinch zoom around their pointer anchor. |
| `minimap` | boolean | No | false | Overview with pointer navigation, wheel zoom and keyboard controls; wheel works even if zoom is false. |
| `zoominLimit` | number | No | 7 | Inclusive finite positive maximum scale. |
| `zoomoutLimit` | number | No | 0.5 | Inclusive finite positive minimum; cannot exceed zoominLimit. Invalid limits throw RangeError. |
| `direction` | string | No | t2b | t2b = top to bottom; b2t = bottom to top; l2r = left to right; r2l = right to left. |
| `verticalLevel` | integer >= 2 | No | Unset | Vertical layout from this one-based level onward, including when compact is enabled. |
| `toggleSiblingsResp` | boolean | No | false | Independently toggles the two sibling sides when true. Method side arguments work independently of this control option. |
| `visibleLevel` | nonnegative integer / boolean | No | 999 | Initial depth: true = 999, false = first level, 0 = no initial nodes. |
| `nodeTitle` | string | No | name | Field displayed in the title. |
| `nodeContent` | string | No | title | Field displayed in the content; use an empty string for title-only nodes. |
| `nodeId` | string | No | id | Identity field used by DOM IDs, queries, editing and persistence. |
| `nodeTemplate` | `(data) => VNode / VNode[] / string` | No | Unset | Custom content; prefer Vue slots/VNodes. HTML strings must be trusted or sanitized. |
| `createNode` | `(element, data) => void` | No | Unset | Called after each node mounts with its instance-owned data; controls are not prebuilt. |
| `exportButton` | boolean | No | false | Displays the component's export button. |
| `exportButtonName` | string | No | Export | Export button text. |
| `exportFilename` | string | No | OrgChart | Default download basename, without extension. |
| `exportFileextension` | png / pdf | No | png | Default format; PDF dependencies are loaded on demand. |
| `exportScale` | number | No | 2 | Canvas resolution multiplier; logical PDF size is retained. Nonpositive/nonfinite values fall back to 1. |
| `chartClass` | string | No | Empty | Extra classes on the rendered .orgchart element, including multiple-instance styling. |
| `draggable` | boolean | No | false | Native HTML drag/drop plus touch-hold dragging; root/cycle validation remains enforced. |
| `drag` | boolean | No | false | Alias; explicitly supplied draggable takes precedence. |
| `dropCriteria` | `(draggedNode, dragZone, dropZone) => boolean` | No | Unset | Receives dragged element, old parent or null, and destination; adds restrictions after structural validation. |
| `initCompleted` | `(chartElement) => void` | No | Unset | Called after mount/init; await nextTick for subsequent DOM edits. |
| `icons` | partial icon-class object | No | Lucide fallback | Optional shared theme and individual CSS icon classes; include the external icon stylesheet yourself. |
| `compact` | boolean / `(data) => boolean` | No | Unset | True compacts every branch; callback selects branches. Explicit data.compact survives; vertical/hybrid takes precedence. |

```vue
<OrgChart :data="data" direction="l2r" :visible-level="2"
  :vertical-level="3" :compact="node => node.dense === true"
  toggle-siblings-resp pan zoom minimap draggable
  :zoomout-limit="0.25" :zoomin-limit="4"
  :drop-criteria="(dragged, oldParent, target) => target.id !== 'design'"
  :icons="{ theme: 'fa-solid fa-sm', parentNode: 'fa-user-tie',
    expandToUp: 'fa-angles-up', collapseToDown: 'fa-angles-down',
    collapseToLeft: 'fa-angles-left', expandToRight: 'fa-angles-right',
    collapsed: 'fa-circle-plus', expanded: 'fa-circle-minus' }" />
```

The icon object supports `theme`, `parentNode`, `expandToUp`, `collapseToDown`, `collapseToLeft`, `expandToRight`, `collapsed`, and `expanded`. Unspecified icons fall back to Lucide. Relation arrows point inward to collapse and outward to expand; button edges follow chart direction. Compact children retain plus/minus controls.

#### Rendering And DOM Callbacks

Prefer the node/default slot for Vue markup and reactive child components. `nodeTemplate(data)` is an alternative returning a Vue VNode, VNode array, or trusted HTML string. Default title/content text is escaped; HTML strings are not sanitized by the component.

`createNode(element, data)` is a DOM escape hatch after each node mounts, not a Vue render function. It receives the instance-owned record. Do not mount another application or manually change children/parentage through this callback. Interaction controls are created on demand, so they are not available as prebuilt elements inside createNode. Use icons or a slot for normal customization.

`initCompleted(chartElement)` and the init event indicate mount/reinitialization, not completion of later image loads or all ResizeObserver measurements. Await Vue's nextTick for the DOM resulting from subsequent edits.

## Component Ref Methods

Methods are exposed by `defineExpose` and typed as `OrgChartInstance`. The examples use the `chart` template ref defined in [Usage](#usage), inside a mounted handler where `chart.value` is available. `NodeRef` accepts a string/number ID, a data record containing the configured nodeId, or a rendered node HTMLElement. Use IDs in application code; DOM references are an optional low-level input and can become stale after source replacement. Unknown node references throw an Error. Methods return void unless stated otherwise.

Data snapshots are synchronous. Vue schedules DOM updates: import nextTick from Vue and await it after editing before querying new elements. The ref itself does not expose mutable model/selection state; read snapshots or listen for events instead.

| API group | Methods |
| --- | --- |
| Lifecycle/configuration | init, setOptions, destroy |
| Editing/loading | addAncestors, addDescendants, addParent, addSiblings, addChildren, removeNodes, moveNode, loadChildren |
| Queries | getHierarchy, getFlatDatasource, getNode, getNodeState, getParent, getChildren, getSiblings, getRelatedNodes, getPath |
| Visibility/filtering | hideParent, showParent, hideChildren, showChildren, hideSiblings, showSiblings, expandAll, collapseAll, filterNodes, clearFilter |
| Viewport/minimap | setChartScale, getViewport, centerOnNode, resetView, attachMinimap, detachMinimap, updateMinimap |
| Download | export, exportPNG, exportPDF |

### chart / chartContainer

Read-only element getters on `chart.value`, not additional Vue refs. `chart.value.chart` is the rendered chart HTMLElement, or null when destroyed. `chart.value.chartContainer` is the scroll-container HTMLElement or null before it is attached. They are intended for measurements or integrations; do not use them to mutate structure. The component owns their lifetime.

### init(options = {})

Parameter: optional partial ChartOptions, default an empty object. Returns OrgChartInstance. Applies configuration, resets expansion/selection and revives a destroyed chart. Existing edits remain unless data is replaced. Normal prop changes do not require init; use it for an explicit reset or restoration.

```ts
chart.value?.init({ data: nested, direction: 'b2t', visibleLevel: 2 })
await nextTick()
```

### destroy()

No parameters. Returns OrgChartInstance. Idempotently removes the chart, aborts child requests and clears observers, animation frames, pointers and drag state. Vue unmount calls it automatically; manual destruction is rarely necessary. The component ref still exists while mounted, but its chart getter becomes null. Call init with data to revive it.

### setOptions(options) / setOptions(name, value)

Accepts a partial ChartOptions object, or a keyof ChartOptions plus its value. Returns OrgChartInstance. Validates before applying; owned data, viewport, selection and navigation survive normal layout changes. Changing visibleLevel resets expansion; replacing data or changing nodeId reconstructs the model. Imperative values override corresponding props. Prefer binding reactive props for normal Vue state management.

```ts
chart.value?.setOptions({ pan: true, zoom: true, direction: 'l2r' })
chart.value?.setOptions('exportScale', 3)
```

### attachMinimap()

No parameters. Enables the minimap through an imperative option override; returns OrgChartInstance. Prefer a reactive minimap prop when its visibility is application state.

### detachMinimap()

No parameters. Disables the minimap through an imperative option override; returns OrgChartInstance. This overrides a bound minimap prop just like setOptions does.

### updateMinimap(forceRefresh = false)

Optional boolean, default false; returns void. Synchronously reads host dimensions and scroll bounds after an integration changes the container. Preview geometry already follows reactive layout, so the flag has no additional rendering effect. Ordinary Vue updates and scrolling refresh it automatically.

### addAncestors(data, parentId)

Required parameters: ancestor datasource and the string/number ID of the new ancestor that receives the existing root groups. Returns void. Use an existing ID in the supplied ancestor hierarchy; the old roots are appended below that ancestor.

```ts
chart.value?.addAncestors({ id: 'board', name: 'Board',
  children: [{ id: 'holding', name: 'Holding company' }] }, 'holding')
```

### addDescendants(data, parent)

Required parameters: OrgNode[] or OrgNode[][] descendants, then parent NodeRef. Returns void. This is the data-first alias for addChildren(parent, data); it appends descendants and expands the parent. It does not replace existing children.

```ts
chart.value?.addDescendants([{ id: 'platform', name: 'Platform' }], 'engineering')
```

### addParent(currentRoot, data)

Required parameters: current root NodeRef and a new parent record with an ID. Returns void. Wraps the current root hierarchy. A non-root argument is rejected; use moveNode for ordinary reparenting.

```ts
chart.value?.addParent('company', { id: 'holding', name: 'Holding company' })
```

### addSiblings(node, data)

Required parameters: anchor NodeRef and array of new sibling records or household arrays. Returns void. Appends siblings under the same parent. A regular tree root cannot have siblings; add a parent first. A family edit must preserve the surrounding spouses.

```ts
chart.value?.addSiblings('engineering', [{ id: 'support', name: 'Support' }])
```

### addChildren(node, data)

Required parameters: parent NodeRef and array of new child records or household arrays. Returns void. Appends children and expands the parent. IDs must remain unique throughout the chart, including the inserted descendants.

```ts
chart.value?.addChildren('engineering', [{ id: 'platform', name: 'Platform' }])
await nextTick()
const platformElement = chart.value?.getNode('platform')
```

### removeNodes(node)

Required parameter: NodeRef. Returns void. Removes that member and its descendants, cancels associated pending loads and repairs selection. It does not remove a spouse merely because the spouse shares a household. Removing the last/root tree destroys the chart.

### getHierarchy(includeNodeData = false)

Optional boolean; returns a copied IDs/children hierarchy, or full node records when true. Grouped families retain grouped arrays. Returns an error string, not an empty success object, when the chart or required IDs are unavailable. Includes loaded hidden/collapsed nodes.

```ts
if (!chart.value) return
const hierarchy = chart.value.getHierarchy(true)
if (typeof hierarchy === 'string') throw new Error(hierarchy)
await fetch('/api/chart', { method: 'PUT',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(hierarchy) })
```

### getFlatDatasource()

No parameters. Returns fresh depth-first records including hidden descendants; recalculates parent_id using nodeId, gives roots null, and omits children, level and internal parentId. Validation errors are the same error strings as getHierarchy. Exporting does not modify owned data.

```ts
if (!chart.value) return
const records = chart.value.getFlatDatasource()
if (typeof records !== 'string') chart.value.init({ data: records }) // Ordinary tree only.
```

Family records additionally receive generated family_id values. They identify groups in this snapshot, not permanent household IDs. Restore them with `flatToFamily(records, nodeId)` before binding the resulting grouped arrays, not as ordinary flat data.

### getNodeState(node, relation?)

Required NodeRef; optional relation is parent, children or siblings. Returns `{ exist: boolean, visible: boolean }`; without relation it describes the node itself. Visible means at least one related loaded node is shown, not that unloaded server data exists or that the card intersects the viewport.

```ts
if (!chart.value) return
const { exist, visible } = chart.value.getNodeState('engineering', 'children')
if (exist && !visible) chart.value.showChildren('engineering')
```

### getParent(node)

Required NodeRef. Returns the rendered parent HTMLElement or null, including a loaded parent that is currently hidden. A root has no parent.

### getChildren(node)

Required NodeRef. Returns an array of direct child HTMLElements, including loaded hidden children. Does not recursively include grandchildren. In families it queries the selected member's own children, not shared-control spouse fallback.

### getSiblings(node)

Required NodeRef. Returns an array of rendered members with the same chart parent, excluding the node itself. Loaded hidden members are included; do not assume one element per household.

### getRelatedNodes(node, relation)

Required NodeRef and parent / children / siblings relation. Generalized query: parent returns HTMLElement or null; children/siblings return element arrays. Use getNodeState to distinguish loaded existence from visibility.

```ts
const parent = chart.value?.getRelatedNodes('engineering', 'parent')
const children = chart.value?.getRelatedNodes('engineering', 'children')
```

### hideParent(node)

Required NodeRef. Returns void. Hides ancestor cards and sibling households while preserving the chosen descendant path. It does not delete records, and snapshots still include hidden ancestors.

### showParent(node)

Required NodeRef. Returns void. Restores one parent household without restoring hidden sibling households. Repeatedly call along the ancestor path to restore more levels; it is not an expand-all operation.

### hideChildren(node)

Required NodeRef. Returns void. Collapses the loaded child branch and its deeper branches. Showing children again restores only the immediate child groups, matching native navigation. Either spouse can operate a shared child control when only one member owns the descendants.

### showChildren(node)

Required NodeRef. Returns void. Expands the immediate loaded child groups; nested collapsed branches retain their state. It does not fetch unknown children.

### hideSiblings(node, direction?)

Required NodeRef; optional direction is left or right, otherwise both sides. Returns void. Hides sibling households and collapses their descendants while retaining the selected household/spouses. Left/right are logical sibling-order sides, displayed vertically in horizontal chart directions.

### showSiblings(node, direction?)

Same parameters as hideSiblings. Returns void. Restores the selected side's sibling households with descendants still collapsed, and restores their immediate parent if hidden. It does not merge spouses or change parentage.

```ts
chart.value?.hideSiblings('engineering', 'right')
chart.value?.showSiblings('engineering', 'right')
```

### setChartScale(multiplier, anchor?)

Required positive number multiplier; optional anchor `{ x: number, y: number }` relative to the chart container's viewport. Returns void. This is relative scaling, not an absolute scale setter: 1.2 multiplies the current scale by 1.2. Invalid/nonpositive multipliers are ignored; scale is clamped inclusively to zoomoutLimit/zoominLimit. The anchor stays fixed. No DOM element is needed for the Vue calling form.

```ts
chart.value?.setChartScale(1.2, { x: 200, y: 120 })
chart.value?.setChartScale(0.8)
```

### export(filename?, extension?)

Optional basename and png/pdf format; defaults to exportFilename/exportFileextension. Returns `Promise<HTMLCanvasElement | false>`. Empty, busy or destroyed charts resolve false. It captures the current visible chart at full logical size, omits controls and removes viewport transforms from the clone. It does not expand collapsed descendants.

```ts
try {
  const canvas = await chart.value?.export('Team', 'pdf')
  if (canvas) console.log(canvas.width, canvas.height)
} catch (error) {
  console.error('Export failed', error)
}
```

html2canvas and jsPDF are lazy imports, not global script requirements. Use crossorigin="anonymous" on images and a server that permits CORS. exportScale changes resolution, not PDF logical size. Browser canvas/PDF limits still apply; do not attempt an unlimited 10,000-node image. Errors emit the Vue export-error event and reject; both success and failure clear the mask. OS display scaling and image resolution can affect output quality. Mark slot elements with data-export-ignore to exclude them from capture.

### exportPNG(canvas, filename = 'OrgChart')

Required HTMLCanvasElement; optional filename basename defaults to OrgChart. Returns `Promise<void>`. Encodes/downloads the supplied PNG and revokes its object URL. This low-level helper does not capture the component, manage its busy mask or emit its export events. Catch encoding errors yourself. Prefer export for a chart download.

### exportPDF(canvas, filename = 'OrgChart', exportScale = 1)

Required HTMLCanvasElement; optional basename defaults to OrgChart. Optional positive finite exportScale defaults to 1; invalid values use 1. Returns `Promise<void>`. Downloads an already prepared canvas as PDF. Page width/height equal canvas pixel dimensions divided by scale. Does not manage component events/mask; catch errors yourself.

### getNode(node)

Required NodeRef. Returns the currently registered HTMLElement or null. Unknown node references throw; null means a known record has no registered element yet. Await nextTick after adding data. Returned nodes may exist but be hidden; use getNodeState to inspect logical visibility.

### moveNode(node, target)

Two required NodeRefs: member to move and new parent. Returns void. Moves the selected member and its descendants, not surrounding spouses. Rejects a regular root, itself, its current parent, a descendant, or a dropCriteria failure before changing structure. Emits node-drop after success; this event is notification, not cancellation. Use dropCriteria for permission checks. Works programmatically without enabling pointer dragging.

```ts
chart.value?.moveNode('design', 'engineering')
```

### loadChildren(node, loader)

Required NodeRef and `(data: OrgNode, signal: AbortSignal) => Promise<OrgNode[] | OrgNode[][]>`. Returns `Promise<boolean>`. Receives copied node data, deduplicates active requests per node, appends successful children and emits load. Concurrent duplicates, aborted or stale requests resolve false. Other errors emit load-error and reject. Removing nodes, replacing data, destruction and unmounting abort related requests; pass signal to fetch.

The component does not fetch unknown relations automatically or infer server-side children. Connect an application button to this method; no loading callback prop is required. See [Remote And On-demand Data](#remote-and-on-demand-data) for the fetch example.

### expandAll(depth = 999)

Optional nonnegative integer depth, default 999. Returns void. Clears sibling/ancestor hiding and expands loaded records through this one-based depth; 0 hides all nodes, 1 shows roots. Invalid depths throw RangeError. It neither requests remote descendants nor clears the active text filter.

### collapseAll()

No parameters. Returns void. Equivalent to expandAll(1); clears ancestor/sibling hiding and leaves only roots visible. Nested expansion is reset rather than saved for the next expandAll.

### filterNodes(keyword)

Required string. Returns void. Trims the keyword and matches the configured nodeTitle field case-insensitively. Shows matching records with ancestor paths and household members; an empty/whitespace keyword disables filtering. While filtering, relation controls are hidden. Does not delete data or change the saved collapse state.

### clearFilter()

No parameters. Returns void. Clears the keyword and restores the underlying navigation state. Snapshots always include all loaded data regardless of filtering.

```ts
chart.value?.filterNodes('engineering')
chart.value?.clearFilter()
```

### centerOnNode(node)

Required NodeRef. Returns void. Reveals its ancestor path and adjusts translation after the next Vue tick to center its measured box. Does not clear a filter; clearFilter first if a nonmatching node is filtered out.

### resetView()

No parameters. Returns void. Resets scroll/translation and sets scale to 1 clamped to configured limits. Does not change data, collapsed branches, filtering or selection; it is not an alias for init.

### getPath(node)

Required NodeRef. Returns OrgNode[] containing copied records from root through the selected member, inclusive. Hidden ancestors are included; use this for reporting paths or breadcrumbs.

### getViewport()

No parameters. Returns a fresh Viewport object `{ x: number, y: number, scale: number }`. It is a snapshot, not mutable reactive component state; use pan/zoom events or the toolbar slot's viewport for live UI.

## Events And v-model

Subscribe with Vue listeners such as @select, @node-drop and @export-error. Payloads are direct arguments, not CustomEvent.detail. Component events do not bubble through arbitrary ancestor components. The chart does not support canceling an edit with event.preventDefault; validate drops with dropCriteria and validate application commands before calling them.

| Vue event | Payload | When |
| --- | --- | --- |
| `node-click`, `select` | Copied node record | Node activation/selection. |
| `deselect` | None | A canvas background click or Escape clears the selection. |
| `change`, `update:data`, `update:datasource` | Full copied hierarchy or null | Structural edits; last-root removal emits null. |
| `init` | Chart HTMLElement | Mount or the next DOM update after init. |
| `show`, `hide` | `{ node, relation }` | Parent/children/siblings visibility action. |
| `node-drop` | `{ draggedNode, dropZone }` | Successful move/drop. |
| `load` | `{ node, data }` | Successful asynchronous child insertion. |
| `load-error` | `{ node, error }` | Non-aborted child request failure; the method Promise also rejects. |
| `zoom`, `pan` | `{ x, y, scale }` | Viewport change. |
| `export` | `{ canvas, filename, extension }` | Successful capture/download. |
| `export-error` | `{ error }` | Export failure; rejected Promise still needs handling. |

`v-model:data` subscribes to update:data. `v-model:datasource` uses the alias event. Edits emit copied full snapshots; a parent's echo of the same published snapshot preserves expansion and selection. Replacing the source with a different value reconstructs the model and resets loaded/navigation state. Selection, viewport changes and filtering do not emit structural update snapshots. Use one source binding rather than binding both aliases.

```vue
<OrgChart v-model:data="data" @select="selected = $event"
  @node-drop="onDrop" @export-error="({ error }) => console.error(error)" />
```

Use the Vue interface above for new integrations. Low-level DOM notifications, where present, are implementation-specific and are not interchangeable with another library's event contract. The [migration guide](docs/migration.md) contains compatibility context separately from this component reference.

## Slots

| Slot | Scope | Contract |
| --- | --- | --- |
| `node` | `{ nodeData, node, selected, expanded, loading }` | nodeData/node are OrgNode aliases; flags are booleans. Replaces node content, not its surrounding controls. |
| `default` | Same as node | Alternative unnamed node slot; named node takes precedence when both exist. |
| `toolbar` | `{ chart, viewport }` | chart is OrgChartInstance, not the template ref or DOM chart; viewport is reactive Viewport state. |
| `empty` | No scope | Empty-chart content rendered when no records are loaded. |

```vue
<OrgChart :data="data">
  <template #node="{ nodeData, selected, loading }">
    <strong :class="{ selected }">{{ nodeData.name }}</strong>
    <button :disabled="loading" @click.stop="loadTeam(nodeData)">Load team</button>
  </template>
  <template #toolbar="{ chart: api, viewport }">
    <button @click="api.resetView()">Reset</button>
    <output>{{ Math.round(viewport.scale * 100) }}%</output>
  </template>
  <template #empty><p>No organization data</p></template>
</OrgChart>
```

The loadTeam handler is application code calling loadChildren as shown above. Stop propagation on interactive slot controls if they should not select a node. Do not mutate structural slot data: use editing methods or replace the bound datasource. Custom slot content is measured by ResizeObserver.

## Styling

Import the package stylesheet once and give the component a height. Override CSS variables on the component root; use :deep when reaching internal classes from a scoped Vue stylesheet.

```vue
<template><OrgChart class="team-chart" :data="data" /></template>
<style scoped>
.team-chart { height: 600px; --oc-node-width: 190px; --oc-line-color: #527d72; }
.team-chart :deep(.sales-team .title) { background: #8d3452; }
</style>
```

| Variable | Default | Meaning |
| --- | --- | --- |
| `--oc-node-width` | 168px | Default node width. |
| `--oc-row-height` | 72px | Default minimum node height. |
| `--oc-line-color` | #96ada6 | Connector stroke. |
| `--oc-hover-color` | #e7f4ef | Hover/focus node background. |
| `--oc-control-color` | #136b5a | Relation control foreground. |
| `--oc-control-hover-color` | #d7eee5 | Relation control hover background. |
| `--oc-duration` | 180ms | Node/link transition duration. |

Reduced-motion preferences disable transitions without blocking state changes. Node hooks include .node, .title, .content, .focused, .matched, .oc-drop-target and data-parent/data-level/data-layout. Do not rely on private component nesting for structural editing. Pointer pan starts on background; touch-hold dragging starts after 350ms. Keyboard and hidden-node inert behavior remain available with custom content.

## Data Helpers And Types

Import helpers directly from the package, not through the component ref. Inputs are copied; fields must be structured-clone-compatible JSON-like records. Functions belong in props/options, not datasource records.

| Export | Signature / result |
| --- | --- |
| `flatToTree` | `(rows: OrgNode[], nodeId = 'id') => OrgNode` or null; validates a single-root parent_id table. |
| `ulToTree` | `(element: HTMLUListElement, nodeId = 'id') => OrgNode` or null; converts a nested list. |
| `flatToFamily` | `(rows: OrgNode[], nodeId = 'id') => OrgNode[][]`; converts family_id/parent_id records into household arrays. |
| `OrgChart` | Named component export; also the default export, with optional app.use registration. |

```ts
import { flatToFamily, type Datasource } from 'vue-organization-chart'
import { shallowRef } from 'vue'
const familyData = shallowRef<Datasource>(flatToFamily([
  { id: 'mother', family_id: 'parents', parent_id: null, name: 'Mother' },
  { id: 'father', family_id: 'parents', parent_id: null, name: 'Father' },
  { id: 'child', family_id: 'children', parent_id: 'mother', name: 'Child' },
]))
```

Public types include OrgChartInstance, ChartOptions, OrgNode, Datasource, NodeRef, NodeId, Direction, Relation, NodeState, Viewport, Icons and ChartEvent. Datasource is OrgNode | OrgNode[] | OrgNode[][] | HTMLUListElement | null; Direction is t2b | b2t | l2r | r2l; Relation is parent | children | siblings. Import these with type imports for application handlers. Vue remains a peer dependency; there is no native OrgChart runtime dependency.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` / `npm run serve` | Interactive demos |
| `npm run lint` | ESLint, Vue and TypeScript checks |
| `npm run typecheck` | Vue/TypeScript public and test types |
| `npm test` | Model, layout, component, gesture, export and demo tests |
| `npm run test:coverage` | V8 report in `coverage/` |
| `npx playwright install chromium` | Install E2E browser |
| `npm run test:e2e` | Desktop and mobile Chromium tests |
| `npm run build` | Demo app in `demo-dist/` |
| `npm run build-component` | ESM/CJS, CSS and declarations in `dist/` |
| `npm run check` | All quality/build/browser gates |

The lockfile pins the resolved versions. Dependencies were queried from npm for this migration; TypeScript uses the latest compatible 6.0 line because `typescript-eslint` does not yet accept TypeScript 7. Lucide uses the maintained `@lucide/vue` package. No unsupported peer dependency bypass is used.

## License And Credits

MIT, see [LICENSE](LICENSE). Original OrgChart design and demo portraits are from dabeng/OrgChart. Thanks to the original jOrgChart contributors. The map demo uses a repository-owned schematic continent dataset, not a navigation-grade basemap. The 10,000-node example starts at depth 2; its expand-all control renders all loaded nodes. Render time is measured locally and is not a promise of 500ms on every device.
