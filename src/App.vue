<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Code, Copy, Download, Expand, Focus, ListTree, Menu, Minus, Plus, RefreshCw, Search, Trash2, X, ZoomIn, ZoomOut } from '@lucide/vue'
import OrgChart from './components/index.js'
import { ChartModel } from './components/tree'
import { buildDemo, demos } from './demos'
import { demoSource } from './demo-source'
import type { ChartOptions, Datasource, Direction, OrgNode } from './components/types'
import type { OrgChartInstance } from './components/useChart'
import './app.css'
const GeoMap = defineAsyncComponent(() => import('./GeoMap.vue'))
function routeId() { return location.hash.replace(/^#\/?/, '') || new URLSearchParams(location.search).get('demo') || location.pathname.match(/\/demo\/([^/]+)\.html$/)?.[1] || 'local-datasource' }
const currentId = ref(routeId()); const chart = ref<OrgChartInstance | null>(null)
const datasource = shallowRef<Datasource>(null); const chartOptions = ref<ChartOptions>({})
const currentDemo = computed(() => demos.find(demo => demo.id === currentId.value) ?? demos[0]!)
const search = ref(''); const filter = ref(''); const selected = ref<OrgNode | null>(null)
const sidebarOpen = ref(false); const inspectorTab = ref('hierarchy'); const snapshot = shallowRef<OrgNode | OrgNode[][] | string | null>(null)
const flat = shallowRef<OrgNode[] | string>([]); const sourceEditor = ref(''); const error = ref(''); const pending = ref(false); const elapsed = ref(0)
const nodeName = ref('New colleague'); const nodeTitle = ref('Engineer'); const moveTarget = ref(''); const depth = ref(2); const format = ref<'png' | 'pdf'>('png')
let sequence = 0; let loadController: AbortController | undefined; let startTime = performance.now()
const groups = computed(() => [...new Set(demos.map(demo => demo.category))].map(category => ({ category, demos: demos.filter(demo => demo.category === category && (demo.name + demo.id).toLowerCase().includes(search.value.toLowerCase())) })).filter(group => group.demos.length))
const rows = computed(() => Array.isArray(flat.value) ? flat.value : [])
const stats = computed(() => ({ nodes: rows.value.length, households: new Set(rows.value.map(row => row.family_id).filter(Boolean)).size }))
const selectedId = computed(() => selected.value?.id ?? null)
const selectedCoordinates = computed(() => selected.value?.coordinates as number[] | undefined)
const selectedCity = computed(() => selected.value?.city as string | undefined)
const path = computed(() => { snapshot.value; if (selectedId.value == null || !chart.value) return []; try { return chart.value.getPath(selectedId.value) } catch { return [] } })
const relationState = computed(() => { snapshot.value; if (selectedId.value == null || !chart.value) return {}; return Object.fromEntries((['parent', 'children', 'siblings'] as const).map(relation => [relation, chart.value!.getNodeState(selectedId.value!, relation)])) })
const output = computed(() => JSON.stringify(inspectorTab.value === 'flat' ? flat.value : inspectorTab.value === 'path' ? path.value : inspectorTab.value === 'relations' ? relationState.value : snapshot.value, null, 2))
const portraitSlot = computed(() => ['family', 'family-tags', 'portraits', 'loading'].includes(currentDemo.value.kind ?? ''))
const sourcePanel = ref<HTMLElement | null>(null); const sourceFileIndex = ref(0); const copyStatus = ref('')
const sourceFiles = computed(() => demoSource(currentDemo.value.id))
const sourceFile = computed(() => sourceFiles.value[sourceFileIndex.value] ?? sourceFiles.value[0]!)
function selectSourceFile(index: number) { sourceFileIndex.value = index; copyStatus.value = '' }
function sourceKeydown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const count = sourceFiles.value.length
  selectSourceFile(event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : (sourceFileIndex.value + (event.key === 'ArrowRight' ? 1 : -1) + count) % count)
  sourcePanel.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[sourceFileIndex.value]?.focus()
}
async function copySource() {
  const file = sourceFile.value
  try { await navigator.clipboard.writeText(file.code); if (sourceFile.value === file) copyStatus.value = 'Copied' }
  catch { if (sourceFile.value === file) copyStatus.value = 'Could not copy source' }
}
function refresh() { if (!chart.value) return; snapshot.value = chart.value.getHierarchy(true); flat.value = chart.value.getFlatDatasource() }
async function run(action: () => unknown | Promise<unknown>) { error.value = ''; try { await action(); await nextTick(); refresh() } catch (value) { error.value = value instanceof Error ? value.message : String(value) } }
async function openDemo() {
  loadController?.abort(); loadController = new AbortController(); const controller = loadController
  pending.value = false; error.value = ''; selected.value = null; filter.value = ''; moveTarget.value = ''; sidebarOpen.value = false; selectSourceFile(0); startTime = performance.now()
  const configuration = buildDemo(currentId.value); datasource.value = configuration.data; chartOptions.value = configuration.options; format.value = configuration.options.exportFileextension ?? 'png'
  sourceEditor.value = JSON.stringify(configuration.data instanceof HTMLUListElement ? new ChartModel(configuration.data).snapshot() : configuration.data, null, 2)
  if (configuration.demo.kind === 'remote') {
    pending.value = true
    try { const response = await fetch('/data/company.json', { signal: controller.signal }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data = await response.json(); if (!controller.signal.aborted) { datasource.value = data; sourceEditor.value = JSON.stringify(data, null, 2) } }
    catch (value) { if (!controller.signal.aborted) error.value = value instanceof Error ? value.message : String(value) }
    finally { if (loadController === controller) pending.value = false }
  }
  await nextTick(); refresh()
}
function onInit() { elapsed.value = Math.round(performance.now() - startTime); nextTick(refresh) }
function select(node: OrgNode) { selected.value = node; refresh(); if (currentId.value === 'center-on-selected-node') chart.value?.centerOnNode(node.id!); if (currentId.value === 'report-path') inspectorTab.value = 'path'; if (currentId.value === 'get-related-nodes') inspectorTab.value = 'relations' }
function add(relation: 'children' | 'siblings' | 'parent') {
  if (selectedId.value == null) return
  const node = { id: `new-${++sequence}`, name: nodeName.value, title: nodeTitle.value }
  run(() => { if (relation === 'parent') chart.value!.addParent(selectedId.value!, node); else if (relation === 'siblings') chart.value!.addSiblings(selectedId.value!, [node]); else chart.value!.addChildren(selectedId.value!, [node]) })
}
async function requestChildren(node: OrgNode) {
  await run(() => chart.value!.loadChildren(node.id!, async (_data, signal) => {
    const response = await fetch('/data/children.json', { signal }); if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const children = await response.json() as OrgNode[]
    function unique(record: OrgNode): OrgNode { return { ...record, id: `${node.id}-${record.id}`, children: record.children ? (record.children as OrgNode[]).map(unique) : undefined } }
    return children.map(unique)
  }))
}
async function requestAncestors() { await run(async () => { const response = await fetch('/data/ancestors.json'); if (!response.ok) throw new Error(`HTTP ${response.status}`); chart.value!.addAncestors(await response.json(), 'ancestor-2') }) }
function applySource() { run(() => { const parsed = JSON.parse(sourceEditor.value) as Datasource; new ChartModel(parsed); datasource.value = parsed; selected.value = null }) }
function changeLayout(event: Event) { const mode = (event.target as HTMLSelectElement).value; chartOptions.value = { ...chartOptions.value, compact: mode === 'compact', verticalLevel: mode === 'vertical' ? 2 : undefined } }
function changeDirection(direction: Direction) { chartOptions.value = { ...chartOptions.value, direction } }
function remove() { if (selectedId.value != null) run(() => { chart.value!.removeNodes(selectedId.value!); selected.value = null }) }
function routeChanged() { currentId.value = routeId() }
watch(currentId, openDemo, { immediate: true })
onMounted(() => { window.addEventListener('hashchange', routeChanged); window.addEventListener('popstate', routeChanged) })
onBeforeUnmount(() => { loadController?.abort(); window.removeEventListener('hashchange', routeChanged); window.removeEventListener('popstate', routeChanged) })
</script>
<template>
  <div class="workbench">
    <header class="app-header"><button class="icon-button mobile-menu" title="Demos" aria-label="Demos" @click="sidebarOpen = !sidebarOpen"><Menu :size="20" /></button><img src="/logo.png" width="30" height="30" alt="" /><h1>Vue OrgChart</h1><span class="version">Vue 3</span><a class="repository" href="https://github.com/dabeng/vue-orgchart" target="_blank" rel="noreferrer">GitHub</a></header>
    <aside class="sidebar" :class="{ open: sidebarOpen }"><div class="sidebar-heading"><strong>Demos</strong><span>{{ demos.length }}</span><button class="icon-button mobile-menu" title="Close demos" aria-label="Close demos" @click="sidebarOpen = false"><X :size="16" /></button></div><label class="search-field"><Search :size="16" /><input v-model="search" placeholder="Search demos" aria-label="Search demos" /></label><nav><section v-for="group in groups" :key="group.category"><h2>{{ group.category }}</h2><a v-for="demo in group.demos" :key="demo.id" :href="`#/${demo.id}`" :class="{ active: currentId === demo.id }" :aria-current="currentId === demo.id ? 'page' : undefined">{{ demo.name }}<ArrowRight v-if="currentId === demo.id" :size="14" /></a></section></nav></aside>
    <main class="main-panel"><div class="view-heading"><div><span class="category-label">{{ currentDemo.category }}</span><h2>{{ currentDemo.name }}</h2></div><div class="metrics"><span><b>{{ stats.nodes.toLocaleString('en-US') }}</b> nodes</span><span v-if="stats.households"><b>{{ stats.households }}</b> families</span><span><b>{{ elapsed }}</b> ms</span></div></div>
      <div class="toolbar"><div class="direction-control" role="group" aria-label="Direction"><button v-for="[direction, icon, label] in [['t2b', ArrowDown, 'Top to bottom'], ['b2t', ArrowUp, 'Bottom to top'], ['l2r', ArrowRight, 'Left to right'], ['r2l', ArrowLeft, 'Right to left']]" :key="String(direction)" class="icon-button" :class="{ active: chartOptions.direction === direction }" :title="String(label)" :aria-label="String(label)" @click="changeDirection(direction as Direction)"><component :is="icon" :size="17" /></button></div><select aria-label="Layout" @change="changeLayout"><option value="horizontal">Hierarchy</option><option value="vertical" :selected="!!chartOptions.verticalLevel">Vertical</option><option value="compact" :selected="!!chartOptions.compact">Compact</option></select><span class="toolbar-separator" /><button class="icon-button" title="Zoom out" aria-label="Zoom out" @click="chart?.setChartScale(.8)"><ZoomOut :size="18" /></button><button class="icon-button" title="Zoom in" aria-label="Zoom in" @click="chart?.setChartScale(1.2)"><ZoomIn :size="18" /></button><button class="icon-button" title="Reset view" aria-label="Reset view" @click="chart?.resetView()"><Focus :size="18" /></button><button class="icon-button" title="Expand all" aria-label="Expand all" @click="run(() => chart?.expandAll())"><Expand :size="18" /></button><button class="icon-button" title="Collapse all" aria-label="Collapse all" @click="run(() => chart?.collapseAll())"><Minus :size="18" /></button><span class="toolbar-spacer" /><button class="icon-button" title="View source" aria-label="View source" @click="sourcePanel?.scrollIntoView({ behavior: 'smooth', block: 'start' })"><Code :size="18" /></button><select v-model="format" aria-label="Export format"><option value="png">PNG</option><option value="pdf">PDF</option></select><button class="command-button" :disabled="!stats.nodes" @click="run(() => chart!.export('OrgChart', format))"><Download :size="16" />Export</button></div>
      <div class="settings-row"><label v-for="[key, label] in [['pan', 'Pan'], ['zoom', 'Zoom'], ['minimap', 'Minimap'], ['draggable', 'Drag and drop']]" :key="key"><input v-model="chartOptions[key as 'pan']" type="checkbox" />{{ label }}</label><label class="depth-control">Depth<input v-model.number="depth" type="number" min="0" max="999" aria-label="Expansion depth" /><button class="icon-button" title="Apply depth" aria-label="Apply depth" @click="run(() => chart?.expandAll(depth))"><Check :size="15" /></button></label><label class="filter-field"><Search :size="14" /><input v-model="filter" placeholder="Filter nodes" aria-label="Filter nodes" @input="run(() => chart?.filterNodes(filter))" /><button v-if="filter" class="icon-button" title="Clear filter" aria-label="Clear filter" @click="filter = ''; run(() => chart?.clearFilter())"><X :size="14" /></button></label><button class="icon-button" title="Reload data" aria-label="Reload data" @click="openDemo"><RefreshCw :size="16" /></button></div>
      <div v-if="error" class="error-banner" role="alert">{{ error }}<button class="icon-button" title="Dismiss error" aria-label="Dismiss error" @click="error = ''"><X :size="16" /></button></div>
      <div v-if="pending" class="loading-banner" role="status">Loading</div>
      <OrgChart :key="currentId" ref="chart" :data="datasource" v-bind="chartOptions" class="demo-chart" @init="onInit" @node-click="select" @change="refresh" @show="refresh" @hide="refresh">
        <template v-if="portraitSlot" #default="{ nodeData, loading }"><div class="portrait-node"><img v-if="currentDemo.kind !== 'loading'" :src="`/avatar/${nodeData.id}.jpg`" :alt="String(nodeData.name)" crossorigin="anonymous" /><strong>{{ nodeData.name }}</strong><span>{{ nodeData.title }}</span><div v-if="currentDemo.kind === 'family-tags'" class="property-tags"><span>{{ nodeData.gender }}</span><span v-if="nodeData.outsider">Spouse</span></div><button v-if="currentDemo.kind === 'loading'" class="load-button" :disabled="loading" @click.stop="requestChildren(nodeData)"><Plus :size="13" />{{ loading ? 'Loading' : 'Load children' }}</button></div></template>
      </OrgChart>
      <GeoMap v-if="currentDemo.kind === 'map'" :coordinates="selectedCoordinates" :city="selectedCity" />
      <section ref="sourcePanel" class="source-panel" aria-labelledby="source-heading">
        <header class="source-heading"><Code :size="17" /><h3 id="source-heading">Source code</h3><span class="source-language">{{ sourceFile.language }}</span><span class="copy-status" role="status">{{ copyStatus }}</span><button class="icon-button" :title="copyStatus === 'Copied' ? 'Copied' : 'Copy source'" aria-label="Copy source" @click="copySource"><Check v-if="copyStatus === 'Copied'" :size="16" /><Copy v-else :size="16" /></button></header>
        <div class="source-tabs" role="tablist" aria-label="Source files" @keydown="sourceKeydown"><button v-for="(file, index) in sourceFiles" :id="`source-tab-${index}`" :key="file.name" role="tab" :aria-selected="sourceFileIndex === index" aria-controls="source-code" :tabindex="sourceFileIndex === index ? 0 : -1" @click="selectSourceFile(index)">{{ file.name }}</button></div>
        <pre id="source-code" role="tabpanel" :aria-labelledby="`source-tab-${sourceFileIndex}`" tabindex="0"><code>{{ sourceFile.code }}</code></pre>
      </section>
      <section class="edit-section"><header><ListTree :size="17" /><strong>{{ selected?.name || 'No node selected' }}</strong><span v-if="selected">ID {{ selected.id }}</span><button class="icon-button" title="Center node" aria-label="Center node" :disabled="selectedId == null" @click="chart?.centerOnNode(selectedId!)"><Focus :size="16" /></button></header><div class="edit-fields"><label>Name<input v-model="nodeName" aria-label="New node name" /></label><label>Title<input v-model="nodeTitle" aria-label="New node title" /></label><button class="command-button" :disabled="selectedId == null" @click="add('children')"><Plus :size="14" />Add child</button><button class="command-button" :disabled="selectedId == null" @click="add('siblings')"><Plus :size="14" />Add sibling</button><button class="command-button" :disabled="selectedId == null" @click="add('parent')"><Plus :size="14" />Add parent</button><button class="icon-button danger" title="Remove selected branch" aria-label="Remove selected branch" :disabled="selectedId == null" @click="remove"><Trash2 :size="17" /></button><label>Move to<select v-model="moveTarget" aria-label="Move target"><option value="">Select node</option><option v-for="row in rows" :key="String(row.id)" :value="row.id">{{ row.name || row.id }}</option></select></label><button class="icon-button" title="Move node" aria-label="Move node" :disabled="selectedId == null || !moveTarget" @click="run(() => chart?.moveNode(selectedId!, moveTarget))"><ArrowRight :size="16" /></button><button v-if="currentDemo.kind === 'loading'" class="command-button" @click="requestAncestors"><Plus :size="14" />Load ancestors</button></div></section>
      <section class="inspector"><header><div class="inspector-tabs" role="tablist" aria-label="Data views"><button v-for="[tab, label] in [['hierarchy', 'Hierarchy'], ['flat', 'Flat records'], ['path', 'Reporting path'], ['relations', 'Relation state'], ['source', 'Datasource']]" :key="tab" role="tab" :aria-selected="inspectorTab === tab" @click="inspectorTab = tab">{{ label }}</button></div><Code :size="17" /></header><template v-if="inspectorTab === 'source'"><textarea v-model="sourceEditor" aria-label="JSON datasource" spellcheck="false" /><button class="command-button apply-source" @click="applySource"><Check :size="15" />Apply JSON</button></template><pre v-else tabindex="0">{{ output }}</pre></section>
      <footer>OrgChart · MIT <span>{{ currentDemo.id }}.html</span></footer>
    </main>
  </div>
</template>
