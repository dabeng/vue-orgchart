import { buildDemo } from './demos'
import { ChartModel } from './components/tree'
import mapSource from './GeoMap.vue?raw'

export interface DemoSourceFile { name: string; language: string; code: string }

const callbacks: Record<string, Record<string, string>> = {
  'options-compact-drag': { compact: '(node) => (node.children?.length ?? 0) >= 2' },
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

const actions: Record<string, { script: string; template: string; event?: string }> = {
  'reload-data': { script: `function reload() { data.value = structuredClone(initialData) }`, template: '<button @click="reload">Reload data</button>' },
  'expand-to-given-depth': { script: 'const depth = ref(2)', template: '<input v-model.number="depth" type="number" min="0" aria-label="Expansion depth" />\n  <button @click="chart?.expandAll(depth)">Apply depth</button>' },
  'center-on-selected-node': { script: 'function select(node: OrgNode) { chart.value?.centerOnNode(node.id!) }', template: '', event: '@node-click="select"' },
  'filter-node': { script: 'const query = ref(\'\')', template: '<input v-model="query" aria-label="Filter nodes" @input="chart?.filterNodes(query)" />\n  <button @click="query = \'\'; chart?.clearFilter()">Clear filter</button>' },
  'report-path': { script: 'const path = ref<OrgNode[]>([])\nfunction select(node: OrgNode) { path.value = chart.value?.getPath(node.id!) ?? [] }', template: '<pre>{{ JSON.stringify(path, null, 2) }}</pre>', event: '@node-click="select"' },
  'get-related-nodes': { script: `const relations = ref({})
function select(node: OrgNode) {
  relations.value = Object.fromEntries((['parent', 'children', 'siblings'] as const)
    .map(relation => [relation, chart.value?.getNodeState(node.id!, relation)]))
}`, template: '<pre>{{ JSON.stringify(relations, null, 2) }}</pre>', event: '@node-click="select"' },
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
  if (id.startsWith('edit-')) {
    setup.push(`const selectedId = ref<string | number | null>(null)
const name = ref('New colleague')
const title = ref('Engineer')
const moveTarget = ref('')
let sequence = 0
function add(relation: 'children' | 'siblings' | 'parent') {
  if (selectedId.value == null) return
  const node = { id: \`new-\${++sequence}\`, name: name.value, title: title.value }
  if (relation === 'parent') chart.value?.addParent(selectedId.value, node)
  else if (relation === 'siblings') chart.value?.addSiblings(selectedId.value, [node])
  else chart.value?.addChildren(selectedId.value, [node])
}
function remove() {
  if (selectedId.value == null) return
  chart.value?.removeNodes(selectedId.value)
  selectedId.value = null
}`)
    attributes.push('@node-click="selectedId = $event.id ?? null"')
    controls.push(`<input v-model="name" aria-label="New node name" />
  <input v-model="title" aria-label="New node title" />
  <button :disabled="selectedId == null" @click="add('children')">Add child</button>
  <button :disabled="selectedId == null" @click="add('siblings')">Add sibling</button>
  <button :disabled="selectedId == null" @click="add('parent')">Add parent</button>
  <button :disabled="selectedId == null" @click="remove">Remove branch</button>
  <input v-model="moveTarget" aria-label="Move target ID" />
  <button :disabled="selectedId == null || !moveTarget" @click="chart?.moveNode(selectedId!, moveTarget)">Move node</button>`)
  }
  if (id.startsWith('export-') || id === 'options-export-navigation') controls.push(`<button @click="chart?.export('OrgChart', '${options.exportFileextension ?? 'png'}')">Export</button>`)
  if (demo.kind === 'loading') {
    setup.push(`async function requestChildren(node: OrgNode) {
  await chart.value?.loadChildren(node.id!, async (_data, signal) => {
    const response = await fetch('/data/children.json', { signal })
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`)
    const children = await response.json() as OrgNode[]
    function unique(record: OrgNode): OrgNode {
      return { ...record, id: \`\${node.id}-\${record.id}\`, children: record.children ? (record.children as OrgNode[]).map(unique) : undefined }
    }
    return children.map(unique)
  })
}
async function requestAncestors() {
  const response = await fetch('/data/ancestors.json')
  if (!response.ok) throw new Error(\`HTTP \${response.status}\`)
  chart.value?.addAncestors(await response.json(), 'ancestor-2')
}`)
    controls.push('<button @click="requestAncestors">Load ancestors</button>')
  }

  const portraits = ['family', 'family-tags', 'portraits', 'loading'].includes(demo.kind ?? '')
  let slot = ''
  if (portraits) {
    slot = `
    <template #default="{ nodeData, loading }">
      <div class="portrait-node">
        ${demo.kind === 'loading' ? '' : '<img :src="`/avatar/${nodeData.id}.jpg`" :alt="String(nodeData.name)" crossorigin="anonymous" />\n        '}<strong>{{ nodeData.name }}</strong>
        <span>{{ nodeData.title }}</span>${demo.kind === 'family-tags' ? '\n        <div class="property-tags"><span>{{ nodeData.gender }}</span><span v-if="nodeData.outsider">Spouse</span></div>' : ''}${demo.kind === 'loading' ? '\n        <button :disabled="loading" @click.stop="requestChildren(nodeData)">{{ loading ? \'Loading\' : \'Load children\' }}</button>' : ''}
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

<template>
  <OrgChart ref="chart" :data="data" v-bind="options" class="demo-chart"${attributes.length ? ' ' + attributes.join(' ') : ''}${slot ? '>' + slot + '</OrgChart>' : ' />'}${controls.length ? '\n  ' + controls.join('\n  ') : ''}
</template>`

  return [{ name: `${demo.id}.vue`, language: 'vue', code }, ...files, { name: 'demo.css', language: 'css', code: styles.join('\n') }]
}