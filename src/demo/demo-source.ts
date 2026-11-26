import { buildDemo, reloadDatasources } from './demos'
import { ChartModel } from '../components/tree'
import mapSource from './GeoMap.vue?raw'
import highlightSource from './demo-highlights.ts?raw'

export interface DemoSourceFile { name: string; language: string; code: string }

const callbacks: Record<string, Record<string, string>> = {
  'options-compact-drag': { compact: `(node) => node.id === '2'` },
  'drag-drop': { dropCriteria: `(dragged, _parent, target) => !(dragged.querySelector('.content')?.textContent?.includes('manager') && target.querySelector('.content')?.textContent?.includes('engineer'))` },
  'option-createNode': { createNode: `(element, node) => {
    const tag = document.createElement('span')
    tag.className = 'node-tag'
    tag.textContent = \`ID \${node.id}\`
    element.append(tag)
  }` },
  'custom-template': { nodeTemplate: `(node) => h('div', { class: 'employee-template' }, [
    h('img', { src: \`/avatar/\${node.id}.jpg\`, alt: '', crossorigin: 'anonymous' }),
    h('div', [h('strong', String(node.name)), h('small', String(node.title)),
      h('a', { href: \`mailto:employee\${node.id}@example.com\` }, 'Email')])
  ])` },
}

const actions: Record<string, { script: string; template: string; event?: string; toolbar?: string }> = {
  'reload-data': { script: `const reloadIndex = ref(0)
function reload(index: number) {
  data.value = structuredClone(reloadDatasources[index]!)
  reloadIndex.value = index
}`, template: `<div role="group" aria-label="Reload data">
    <span>Reload data</span>
    <button v-for="(_, index) in reloadDatasources" :key="index" :aria-pressed="reloadIndex === index" @click="reload(index)">Chart {{ index + 1 }}</button>
  </div>` },
  'expand-to-given-depth': { script: 'const depth = ref(2)', template: '<input v-model.number="depth" type="number" min="0" aria-label="Expansion depth" />\n  <button @click="chart?.expandAll(depth)">Apply depth</button>' },
  'center-on-selected-node': { script: 'function select(node: OrgNode) { chart.value?.centerOnNode(node.id!) }', template: '', event: '@node-click="select"' },
  'filter-node': { script: 'const query = ref(\'\')', template: '<input v-model="query" aria-label="Filter nodes" @input="chart?.filterNodes(query)" />\n  <button @click="query = \'\'; chart?.clearFilter()">Clear filter</button>' },
  'report-path': { script: `const selectedId = ref<OrgNode['id']>()
const path = shallowRef<OrgNode[]>([])
const active = ref(false)
function updatePath() {
  path.value = selectedId.value != null ? chart.value?.getPath(selectedId.value) ?? [] : []
}
function select(node: OrgNode) {
  if (node.id !== selectedId.value) active.value = false
  selectedId.value = node.id
  updatePath()
}
watchPostEffect(onCleanup => {
  if (active.value && chart.value) onCleanup(markReportingPath(path.value.map(node => chart.value!.getNode(node.id!))))
})`, template: '<pre>{{ JSON.stringify(path, null, 2) }}</pre>', event: '@node-click="select" @show="updatePath" @hide="updatePath" :class="{ \'demo-report-active\': active }"', toolbar: `<button :disabled="!path.length || active" @click="active = true">Draw reporting path</button>
  <button :disabled="!active" @click="active = false">Clear reporting path</button>` },
  'get-related-nodes': { script: `const selectedId = ref<OrgNode['id']>()
const relations = shallowRef({})
function updateRelations() {
  const id = selectedId.value
  if (id != null && chart.value) relations.value = Object.fromEntries(relationLegend.map(([relation]) => [relation, chart.value!.getNodeState(id, relation)]))
}
function select(node: OrgNode) {
  selectedId.value = node.id
  updateRelations()
}
watchPostEffect(onCleanup => {
  const instance = chart.value
  const id = selectedId.value
  if (id != null && instance && Object.keys(relations.value).length) {
    onCleanup(markRelatedNodes(relationLegend.map(([relation]) => [relation, instance.getRelatedNodes(id, relation)])))
  }
})`, template: '<pre>{{ JSON.stringify(relations, null, 2) }}</pre>', event: '@node-click="select" @show="updateRelations" @hide="updateRelations"', toolbar: `<ul class="relation-legend" aria-label="Node relationships">
    <li v-for="[relation, label] in relationLegend" :key="relation" :data-node-relation="relation">{{ label }}</li>
  </ul>` },
  'get-hierarchy': { script: 'const hierarchy = ref<unknown>(null)', template: '<button @click="hierarchy = chart?.getHierarchy(true)">Get hierarchy</button>\n  <pre>{{ JSON.stringify(hierarchy, null, 2) }}</pre>' },
  'get-flat-datasource': { script: 'const records = ref<unknown>([])', template: '<button @click="records = chart?.getFlatDatasource()">Get flat datasource</button>\n  <pre>{{ JSON.stringify(records, null, 2) }}</pre>' },
}

export function demoSource(id: string): DemoSourceFile[] {
  const { data, options, demo } = buildDemo(id)
  const files: DemoSourceFile[] = []
  const imports = ['ref', 'shallowRef']
  const chartImports: string[] = []
  const extraImports: string[] = []
  const setup: string[] = []
  const controls: string[] = []
  const attributes: string[] = []
  const styles = ['.demo-chart { height: 480px; max-width: 100%; }']
  const customTemplate = id === 'custom-template' || id === 'options-horizontal-template'
  const functions = callbacks[customTemplate ? 'custom-template' : id] ?? {}
  const optionCode = Object.entries(options).map(([key, value]) => `  ${key}: ${typeof value === 'function' ? functions[key] : JSON.stringify(value)}`).join(',\n')
  let dataCode = 'const data = shallowRef(initialData)'

  if (demo.kind === 'remote') {
    imports.push('onMounted')
    dataCode = `const data = shallowRef<Datasource>(null)
onMounted(async () => {
  const response = await fetch('/data/company.json')
  if (!response.ok) throw new Error(\`HTTP \${response.status}\`)
  data.value = await response.json()
})`
  } else if (data instanceof HTMLUListElement) {
    dataCode = `const list = document.createElement('ul')
list.innerHTML = ${JSON.stringify(data.innerHTML)}
const data = shallowRef(list)`
  } else if (demo.kind === 'large') {
    dataCode = `const data = shallowRef({
  id: '1', name: 'Headquarters', title: '10,000 members',
  children: Array.from({ length: 99 }, (_, branch) => ({
    id: \`branch-\${branch}\`, name: \`Department \${branch + 1}\`,
    children: Array.from({ length: 100 }, (_, child) => ({
      id: \`member-\${branch}-\${child}\`, name: \`Member \${branch * 100 + child + 1}\`
    }))
  }))
})`
  } else if (id === 'reload-data') {
    extraImports.push("import reloadDatasources from './data.json'")
    dataCode = 'const data = shallowRef<Datasource>(structuredClone(reloadDatasources[0]!))'
    files.push({ name: 'data.json', language: 'json', code: JSON.stringify(reloadDatasources, null, 2) })
  } else {
    extraImports.push("import initialData from './data.json'")
    const flatFamily = id === 'family-tree-with-flat-datasource'
    files.push({ name: 'data.json', language: 'json', code: JSON.stringify(flatFamily ? new ChartModel(data).flat() : data, null, 2) })
    if (flatFamily) { chartImports.push('flatToFamily'); dataCode = 'const data = shallowRef(flatToFamily(initialData))' }
  }

  if (customTemplate) {
    imports.push('h')
    styles.push('.employee-template { display: flex; gap: 8px; align-items: center; padding: 10px; text-align: left; }', '.employee-template img { width: 36px; height: 36px; border-radius: 50%; }', '.employee-template strong, .employee-template small { display: block; font-size: 11px; }')
  }
  if (id === 'color-coded') styles.push('.color-coded .department-product .title { background: #4c789b; }', '.color-coded .department-research .title { background: #bd5d68; }')
  if (id === 'option-createNode') styles.push('.node-tag { display: inline-block; font-size: 9px; padding: 3px 6px; margin: 0 0 6px; background: #edf2ee; border-radius: 3px; }')
  if (id === 'custom-icons') styles.push(".demo-icon { font-style: normal; }", ".icon-parent::before { content: '\\25c6'; }", ".icon-plus::before { content: '+'; }", ".icon-minus::before { content: '-'; }", ".icon-up::before { content: '\\2191'; }", ".icon-down::before { content: '\\2193'; }", ".icon-left::before { content: '\\2190'; }", ".icon-right::before { content: '\\2192'; }")

  const action = actions[id]
  if (action) { setup.push(action.script); if (action.template) controls.push(action.template); if (action.event) attributes.push(action.event) }
  if (id === 'report-path' || id === 'get-related-nodes') {
    imports.push('watchPostEffect')
    extraImports.push(id === 'report-path' ? "import { markReportingPath } from './demo-highlights'" : "import { markRelatedNodes, relationLegend } from './demo-highlights'")
    files.push({ name: 'demo-highlights.ts', language: 'ts', code: highlightSource })
  }
  if (id === 'report-path') styles.push(
    '.demo-report-active .node[data-report-path] .title { background: #9b450b; }',
    '.demo-report-active .oc-connections path[data-report-path] { stroke: #9b450b; stroke-width: 3; }',
    '.demo-report-active .node:not([data-report-path]) > :is(.title, .content), .demo-report-active .oc-connections path:not([data-report-path]) { opacity: .45; }',
  )
  if (id === 'get-related-nodes') styles.push(
    '.relation-legend { display: flex; flex-wrap: wrap; gap: 12px; padding: 0; list-style: none; }',
    '.relation-legend li::before { content: ""; display: inline-block; width: 10px; height: 10px; margin-right: 5px; background: var(--demo-relation-color); }',
    '[data-node-relation=parent] { --demo-relation-color: #305b93; }',
    '[data-node-relation=children] { --demo-relation-color: #9b450b; }',
    '[data-node-relation=siblings] { --demo-relation-color: #765283; }',
    '.demo-chart .node[data-node-relation] > .title { background: var(--demo-relation-color); }',
  )
  if (id.startsWith('edit-')) {
    imports.push('computed')
    setup.push(`const selectedId = ref<string | number | null>(null)
const drafts = ref([{ name: 'New colleague', title: 'Engineer' }])
const validDrafts = computed(() => drafts.value.filter(draft => draft.name.trim()))
function resetDrafts() { drafts.value = [{ name: 'New colleague', title: 'Engineer' }] }
const moveTarget = ref('')
let sequence = 0
function add(relation: 'children' | 'siblings' | 'parent') {
  if (selectedId.value == null || !validDrafts.value.length || (relation === 'parent' && validDrafts.value.length !== 1)) return
  const nodes = validDrafts.value.map(draft => ({ id: \`new-\${++sequence}\`, name: draft.name.trim(), title: draft.title.trim() }))
  if (relation === 'parent') chart.value?.addParent(selectedId.value, nodes[0]!)
  else if (relation === 'siblings') chart.value?.addSiblings(selectedId.value, nodes)
  else chart.value?.addChildren(selectedId.value, nodes)
}
function remove() {
  if (selectedId.value == null) return
  chart.value?.removeNodes(selectedId.value)
  selectedId.value = null
}`)
    attributes.push('@node-click="selectedId = $event.id ?? null"')
    controls.push(`<div v-for="(draft, index) in drafts" :key="index">
    <label>Name <input v-model="draft.name" /></label>
    <label>Title <input v-model="draft.title" /></label>
    <button v-if="index" @click="drafts.splice(index, 1)">Remove node row {{ index + 1 }}</button>
  </div>
  <button @click="drafts.push({ name: '', title: '' })">Add node row</button>
  <button @click="resetDrafts">Reset node fields</button>
  <button :disabled="selectedId == null || !validDrafts.length" @click="add('children')">{{ validDrafts.length > 1 ? 'Add children' : 'Add child' }}</button>
  <button :disabled="selectedId == null || !validDrafts.length" @click="add('siblings')">{{ validDrafts.length > 1 ? 'Add siblings' : 'Add sibling' }}</button>
  <button :disabled="selectedId == null || validDrafts.length !== 1" @click="add('parent')">Add parent</button>
  <button :disabled="selectedId == null" @click="remove">Remove branch</button>
  <input v-model="moveTarget" aria-label="Move target ID" />
  <button :disabled="selectedId == null || !moveTarget" @click="chart?.moveNode(selectedId!, moveTarget)">Move node</button>`)
  }
  if (id.startsWith('export-') || id === 'options-export-navigation') controls.push(`<button @click="chart?.export('OrgChart', '${options.exportFileextension ?? 'png'}')">Export</button>`)
  if (demo.kind === 'loading') {
    imports.push('onBeforeUnmount')
    setup.push(`const loadedChildren = ref(new Set<string | number>())
const ancestors = ref<'idle' | 'loading' | 'loaded'>('idle')
const error = ref('')
const ancestorController = new AbortController()
onBeforeUnmount(() => ancestorController.abort())

async function requestChildren(node: OrgNode) {
  const id = node.id
  if (id == null || loadedChildren.value.has(id)) return
  error.value = ''
  try {
    const loaded = await chart.value?.loadChildren(id, async (_data, signal) => {
      const response = await fetch('/data/children.json', { signal })
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`)
      const children = await response.json() as OrgNode[]
      function unique(record: OrgNode): OrgNode {
        return { ...record, id: \`\${id}-\${record.id}\`, children: record.children ? (record.children as OrgNode[]).map(unique) : undefined }
      }
      return children.map(unique)
    })
    if (loaded) loadedChildren.value.add(id)
  } catch (value) { error.value = String(value) }
}
async function requestAncestors() {
  const instance = chart.value
  if (!instance || ancestors.value !== 'idle') return
  const { signal } = ancestorController
  error.value = ''
  ancestors.value = 'loading'
  try {
    const response = await fetch('/data/ancestors.json', { signal })
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`)
    const data = await response.json()
    if (!signal.aborted) {
      instance.addAncestors(data, 'ancestor-2')
      ancestors.value = 'loaded'
    }
  } catch (value) { if (!signal.aborted) error.value = String(value) }
  finally { if (ancestors.value === 'loading') ancestors.value = 'idle' }
}`)
    controls.push(`<button :disabled="ancestors !== 'idle'" @click="requestAncestors">{{ ancestors === 'loaded' ? 'Ancestors loaded' : ancestors === 'loading' ? 'Loading ancestors' : 'Load ancestors' }}</button>
  <p v-if="error" role="alert">{{ error }}</p>`)
  }

  const portraits = ['family', 'family-tags', 'portraits', 'loading'].includes(demo.kind ?? '')
  let slot = ''
  if (portraits) {
    slot = `
    <template #default="{ nodeData, loading }">
      <div class="portrait-node">
        ${demo.kind === 'loading' ? '' : '<img :src="`/avatar/${nodeData.id}.jpg`" :alt="String(nodeData.name)" crossorigin="anonymous" />\n        '}<strong>{{ nodeData.name }}</strong>
        <span>{{ nodeData.title }}</span>${demo.kind === 'family-tags' ? '\n        <div class="property-tags"><span>{{ nodeData.gender }}</span><span v-if="nodeData.outsider">Spouse</span></div>' : ''}${demo.kind === 'loading' ? '\n        <button :disabled="loading || loadedChildren.has(nodeData.id!)" @click.stop="requestChildren(nodeData)">{{ loading ? \'Loading\' : loadedChildren.has(nodeData.id!) ? \'Children loaded\' : \'Load children\' }}</button>' : ''}
      </div>
    </template>
  `
    styles.push('.portrait-node { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 12px 8px; }', '.portrait-node img { width: 54px; height: 54px; border-radius: 50%; object-fit: cover; }')
    if (demo.kind === 'family-tags') styles.push('.property-tags { display: flex; gap: 4px; }', '.property-tags span { padding: 2px 5px; font-size: 9px; background: #edf2ee; border-radius: 3px; }')
  }
  if (demo.kind === 'map') {
    imports.push('computed')
    extraImports.push("import GeoMap from './GeoMap.vue'")
    styles.push('.map-section { margin-top: 16px; }', '.map-section header { padding: 10px 0; font-size: 12px; }', '.office-map { height: 280px; background: #e7eef0; border: 1px solid #d8e2dc; }')
    setup.push(`const selected = shallowRef<OrgNode | null>(null)
const coordinates = computed(() => selected.value?.coordinates as number[] | undefined)
const city = computed(() => selected.value?.city as string | undefined)`)
    attributes.push('@node-click="selected = $event"')
    controls.push('<GeoMap :coordinates="coordinates" :city="city" />')
    files.push({ name: 'GeoMap.vue', language: 'vue', code: mapSource })
  }

  const controlMarkup = controls.length ? '\n  ' + controls.join('\n  ') : ''
  const toolbarMarkup = action?.toolbar ? '\n  ' + action.toolbar : id === 'reload-data' ? controlMarkup : ''
  const code = `<script setup lang="ts">
import { ${imports.join(', ')} } from 'vue'
import OrgChart, { ${chartImports.length ? chartImports.join(', ') + ', ' : ''}type ChartOptions, type Datasource, type OrgChartInstance, type OrgNode } from 'vue-organization-chart'
import 'vue-organization-chart/style.css'
import './demo.css'
${extraImports.join('\n')}

const chart = ref<OrgChartInstance | null>(null)
${dataCode}
const options: ChartOptions = {
${optionCode}
}
${setup.length ? '\n' + setup.join('\n\n') + '\n' : ''}</script>

<template>${toolbarMarkup}
  <OrgChart ref="chart" :data="data" v-bind="options" class="demo-chart"${attributes.length ? ' ' + attributes.join(' ') : ''}${slot ? '>' + slot + '</OrgChart>' : ' />'}${id === 'reload-data' ? '' : controlMarkup}
</template>`

  return [{ name: `${demo.id}.vue`, language: 'vue', code }, ...files, { name: 'demo.css', language: 'css', code: styles.join('\n') }]
}