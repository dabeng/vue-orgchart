import { h } from 'vue'
import { ChartModel, flatToFamily } from './components/tree'
import type { ChartOptions, Datasource, OrgNode } from './components/types'
export interface Demo { id: string; name: string; category: string; kind?: string }
export const demos: Demo[] = [
  { id: 'local-datasource', name: 'Local datasource', category: 'Data' },
  { id: 'flat-datasource', name: 'Flat datasource', category: 'Data' },
  { id: 'ul-datasource', name: 'UL datasource', category: 'Data' },
  { id: 'ajax-datasource', name: 'Remote JSON', category: 'Data', kind: 'remote' },
  { id: 'ondemand-loading-data', name: 'On-demand loading', category: 'Data', kind: 'loading' },
  { id: 'reload-data', name: 'Reload data', category: 'Data' },
  { id: 'bottom2top', name: 'Bottom to top', category: 'Layout' },
  { id: 'left2right', name: 'Left to right', category: 'Layout' },
  { id: 'right2left', name: 'Right to left', category: 'Layout' },
  { id: 'vertical-level', name: 'Vertical level', category: 'Layout' },
  { id: 'data-prop-hybrid', name: 'Hybrid branches', category: 'Layout' },
  { id: 'data-prop-compact', name: 'Compact branches', category: 'Layout' },
  { id: 'level-offset', name: 'Level offset', category: 'Layout' },
  { id: 'nodes-of-different-widths', name: 'Different node widths', category: 'Layout' },
  { id: 'responsive-design', name: 'Responsive design', category: 'Layout' },
  { id: '10000-nodes', name: '10,000 nodes', category: 'Layout', kind: 'large' },
  { id: 'pan-zoom', name: 'Pan and zoom', category: 'Navigation' },
  { id: 'minimap', name: 'Minimap', category: 'Navigation' },
  { id: 'toggle-sibs-resp', name: 'Toggle siblings separately', category: 'Navigation' },
  { id: 'default-collapsed', name: 'Default collapsed', category: 'Navigation' },
  { id: 'expand-to-given-depth', name: 'Expand to a given depth', category: 'Navigation' },
  { id: 'center-on-selected-node', name: 'Center selected node', category: 'Navigation' },
  { id: 'filter-node', name: 'Filter nodes', category: 'Navigation' },
  { id: 'report-path', name: 'Reporting path', category: 'Navigation' },
  { id: 'get-related-nodes', name: 'Related nodes', category: 'Navigation' },
  { id: 'edit-chart', name: 'Edit chart', category: 'Editing' },
  { id: 'edit-hybrid-chart', name: 'Edit hybrid chart', category: 'Editing' },
  { id: 'drag-drop', name: 'Drag and drop', category: 'Editing' },
  { id: 'drag-drop-hybrid-chart', name: 'Drag and drop hybrid chart', category: 'Editing' },
  { id: 'get-hierarchy', name: 'Get hierarchy', category: 'Editing' },
  { id: 'get-flat-datasource', name: 'Get flat datasource', category: 'Editing' },
  { id: 'color-coded', name: 'Color-coded chart', category: 'Customization' },
  { id: 'option-createNode', name: 'createNode callback', category: 'Customization' },
  { id: 'custom-template', name: 'Custom template', category: 'Customization' },
  { id: 'custom-icons', name: 'Custom icons', category: 'Customization' },
  { id: 'export-chart', name: 'Export PNG', category: 'Export' },
  { id: 'export-chart-pdf', name: 'Export PDF', category: 'Export' },
  { id: 'export-chart-with-pictures', name: 'Export with pictures', category: 'Export', kind: 'portraits' },
  { id: 'family-tree', name: 'Family tree', category: 'Family trees', kind: 'family' },
  { id: 'family-tree-with-flat-datasource', name: 'Family tree from flat records', category: 'Family trees', kind: 'family' },
  { id: 'familytree-custom-properties', name: 'Family tree properties', category: 'Family trees', kind: 'family-tags' },
  { id: 'integrate-map', name: 'Map integration', category: 'Integration', kind: 'map' },
  { id: 'options-compact-drag', name: 'Compact layout and drag', category: 'Combinations' },
  { id: 'options-export-navigation', name: 'Export and navigation', category: 'Combinations' },
  { id: 'options-horizontal-template', name: 'Horizontal layout and template', category: 'Combinations' },
  { id: 'options-hybrid-navigation', name: 'Hybrid layout and navigation', category: 'Combinations' },
]
export function company(): OrgNode {
  return { id: '1', name: 'Lao Lao', title: 'General manager', city: 'Shanghai', coordinates: [121.47, 31.23], children: [
    { id: '2', name: 'Bo Miao', title: 'Department manager', className: 'department-product', city: 'London', coordinates: [-.12, 51.5], children: [{ id: '4', name: 'Tie Hua', title: 'Senior engineer' }, { id: '5', name: 'Hei Hei', title: 'Senior engineer', children: [{ id: '6', name: 'Pang Pang', title: 'Engineer' }, { id: '7', name: 'Xiang Xiang', title: 'UX engineer' }] }] },
    { id: '3', name: 'Su Miao', title: 'Department manager', className: 'department-research', city: 'New York', coordinates: [-74, 40.71], children: [{ id: '8', name: 'Hong Miao', title: 'Researcher' }, { id: '9', name: 'Chun Miao', title: 'Designer' }] },
  ] }
}
export function family(): OrgNode[][] {
  return [[{ id: '8', name: 'Lao Ye', title: 'Grandfather', gender: 'male' }, { id: '1', name: 'Lao Lao', title: 'Grandmother', gender: 'female', outsider: true, children: [
    [{ id: '2', name: 'Bo Miao', title: 'Aunt', gender: 'female' }],
    [{ id: '3', name: 'Su Miao', title: 'Mother', gender: 'female', children: [[{ id: '12', name: 'Pang Pang', title: 'Wife', outsider: true, gender: 'female', children: [[{ id: '7', name: 'Dan Dan', title: 'Daughter', gender: 'female' }], [{ id: '6', name: 'Er Dan', title: 'Daughter', gender: 'female' }]] }, { id: '5', name: 'Hei Hei', title: 'Me', gender: 'male' }]] }, { id: '9', name: 'Tie Hua', title: 'Father', outsider: true, gender: 'male' }],
    [{ id: '10', name: 'Hong Miao', title: 'Aunt', gender: 'female' }],
  ] }]]
}
export function buildDemo(id: string): { data: Datasource; options: ChartOptions; demo: Demo } {
  const demo = demos.find(item => item.id === id) ?? demos[0]!
  const options: ChartOptions = { nodeContent: 'title', pan: false, zoom: false, minimap: false, draggable: false, direction: 't2b', visibleLevel: 999 }
  let data: Datasource = company()
  const tree = data as OrgNode
  const children = tree.children as OrgNode[]
  if (demo.kind?.startsWith('family')) { data = family(); options.pan = true; options.zoom = true; options.minimap = true; options.draggable = true }
  if (id === 'family-tree-with-flat-datasource') data = flatToFamily(new ChartModel(family()).flat() as OrgNode[])
  if (id === 'flat-datasource') data = new ChartModel(tree).flat() as OrgNode[]
  if (id === 'ul-datasource' && typeof document !== 'undefined') { const list = document.createElement('ul'); list.innerHTML = '<li id="1" data-title="General manager">Lao Lao<ul><li id="2" data-title="Manager">Bo Miao<ul><li id="4">Tie Hua</li></ul></li><li id="3">Su Miao</li></ul></li>'; data = list }
  if (demo.kind === 'remote') data = null
  if (demo.kind === 'loading') data = { id: '1', name: 'Lao Lao', title: 'General manager' }
  if (id === 'bottom2top') options.direction = 'b2t'
  if (id === 'left2right' || id === 'options-horizontal-template') options.direction = 'l2r'
  if (id === 'right2left') options.direction = 'r2l'
  if (id === 'vertical-level' || id === 'edit-hybrid-chart' || id === 'drag-drop-hybrid-chart' || id === 'options-hybrid-navigation') options.verticalLevel = 2
  if (id === 'data-prop-hybrid') children[0]!.hybrid = true
  if (id === 'data-prop-compact') children[0]!.compact = true
  if (id === 'options-compact-drag') options.compact = node => (node.children?.length ?? 0) >= 2
  if (id === 'default-collapsed') children[0]!.collapsed = true
  if (id === 'expand-to-given-depth') options.visibleLevel = 2
  if (id === 'toggle-sibs-resp') options.toggleSiblingsResp = true
  if (id === 'level-offset') children[1]!.levelOffset = 1
  if (id === 'nodes-of-different-widths') { children[0]!.width = 230; children[1]!.width = 130 }
  if (['pan-zoom', 'minimap', 'center-on-selected-node', 'responsive-design', 'options-export-navigation', 'options-hybrid-navigation', 'options-compact-drag'].includes(id)) { options.pan = true; options.zoom = true }
  if (['minimap', 'options-export-navigation', 'options-hybrid-navigation', 'options-compact-drag', 'responsive-design'].includes(id)) options.minimap = true
  if (id.includes('drag') || id.startsWith('edit-')) options.draggable = true
  if (id === 'drag-drop') options.dropCriteria = (dragged, _parent, target) => !(dragged.querySelector('.content')?.textContent?.includes('manager') && target.querySelector('.content')?.textContent?.includes('engineer'))
  if (id.startsWith('export-') || id === 'options-export-navigation') options.exportButton = true
  if (id === 'export-chart-pdf') options.exportFileextension = 'pdf'
  if (id === 'color-coded') options.chartClass = 'color-coded'
  if (id === 'custom-icons') options.icons = { theme: 'demo-icon', parentNode: 'icon-parent', collapsed: 'icon-plus', expanded: 'icon-minus', expandToUp: 'icon-up', collapseToDown: 'icon-down', collapseToLeft: 'icon-left', expandToRight: 'icon-right' }
  if (id === 'option-createNode') options.createNode = (element, node) => { const tag = document.createElement('span'); tag.className = 'node-tag'; tag.textContent = `ID ${node.id}`; element.append(tag) }
  if (id === 'custom-template' || id === 'options-horizontal-template') options.nodeTemplate = node => h('div', { class: 'employee-template' }, [h('img', { src: `/avatar/${node.id}.jpg`, alt: '', crossorigin: 'anonymous' }), h('div', [h('strong', String(node.name)), h('small', String(node.title)), h('a', { href: `mailto:employee${node.id}@example.com` }, 'Email')])])
  if (id === '10000-nodes') {
    data = { id: '1', name: 'Headquarters', title: '10,000 members', children: Array.from({ length: 99 }, (_, branch) => ({ id: `branch-${branch}`, name: `Department ${branch + 1}`, children: Array.from({ length: 100 }, (_, child) => ({ id: `member-${branch}-${child}`, name: `Member ${branch * 100 + child + 1}` })) })) }
    options.compact = true; options.pan = true; options.zoom = true; options.minimap = true; options.visibleLevel = 2
  }
  return { data, options, demo }
}