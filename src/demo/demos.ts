import { h } from 'vue'
import { ChartModel, flatToFamily } from '../components/tree'
import type { ChartOptions, Datasource, OrgNode } from '../components/types'
export interface Demo { id: string; name: string; category: string; subtitle: string; kind?: string }
export const demos: Demo[] = [
  { id: 'local-datasource', name: 'Local datasource', category: 'Data', subtitle: 'This demo builds the chart directly from a local JSON datasource embedded in the page.' },
  { id: 'flat-datasource', name: 'Flat datasource', category: 'Data', subtitle: 'This demo builds a hierarchy from flat records linked by parent IDs.' },
  { id: 'ul-datasource', name: 'UL datasource', category: 'Data', subtitle: 'This demo renders the chart from nested UL markup instead of JSON.' },
  { id: 'ajax-datasource', name: 'Remote JSON', category: 'Data', kind: 'remote', subtitle: 'This demo loads chart data asynchronously and initializes the chart when the JSON response arrives.' },
  { id: 'ondemand-loading-data', name: 'On-demand loading', category: 'Data', kind: 'loading', subtitle: 'This demo loads ancestors and descendants only when requested.' },
  { id: 'reload-data', name: 'Reload data', category: 'Data', subtitle: 'This demo reloads the chart with a different datasource in the same container.' },
  { id: 'bottom2top', name: 'Bottom to top', category: 'Layout', subtitle: 'This demo renders the chart in bottom-to-top mode instead of the default top-to-bottom direction.' },
  { id: 'left2right', name: 'Left to right', category: 'Layout', subtitle: 'This demo renders the chart from left to right instead of the default top-to-bottom layout.' },
  { id: 'right2left', name: 'Right to left', category: 'Layout', subtitle: 'This demo renders the chart from right to left instead of the default top-to-bottom layout.' },
  { id: 'vertical-level', name: 'Vertical level', category: 'Layout', subtitle: 'This demo switches deeper levels into vertical layout to create a hybrid horizontal and vertical chart.' },
  { id: 'data-prop-hybrid', name: 'Hybrid branches', category: 'Layout', subtitle: 'This demo uses the hybrid data property to mix horizontal and vertical descendant layouts in the same chart.' },
  { id: 'data-prop-compact', name: 'Compact branches', category: 'Layout', subtitle: 'This demo marks selected branches as compact so dense child groups consume less horizontal space.' },
  { id: 'level-offset', name: 'Level offset', category: 'Layout', subtitle: 'This demo offsets selected nodes to specific levels so branches can intentionally break the default depth alignment.' },
  { id: 'nodes-of-different-widths', name: 'Different node widths', category: 'Layout', subtitle: 'This demo removes fixed title and content widths so node sizing follows the actual text length.' },
  { id: 'responsive-design', name: 'Responsive design', category: 'Layout', subtitle: 'This demo shows how the chart behaves inside a constrained container across different viewport sizes.' },
  { id: '10000-nodes', name: '10,000 nodes', category: 'Layout', kind: 'large', subtitle: 'This demo generates 10,000 nodes, starts with only the first two levels visible, and displays the initial render time.' },
  { id: 'pan-zoom', name: 'Pan and zoom', category: 'Navigation', subtitle: 'Drag to pan the chart. Wheel zoom stays centered on the pointer, while pinch zoom stays centered between the two fingers.' },
  { id: 'minimap', name: 'Minimap', category: 'Navigation', subtitle: 'This demo enables a live overview in the bottom-right corner of the chart. Its viewport rectangle tracks and controls the visible area.' },
  { id: 'toggle-sibs-resp', name: 'Toggle siblings separately', category: 'Navigation', subtitle: 'This demo lets users collapse and expand left and right sibling groups independently.' },
  { id: 'default-collapsed', name: 'Default collapsed', category: 'Navigation', subtitle: 'This demo starts selected branches in a collapsed state so users expand them only when needed.' },
  { id: 'expand-to-given-depth', name: 'Expand to a given depth', category: 'Navigation', subtitle: 'This demo expands the chart to a chosen depth, leaving deeper levels collapsed.' },
  { id: 'center-on-selected-node', name: 'Center selected node', category: 'Navigation', subtitle: 'This demo centers the selected node in the viewport so large charts are easier to navigate.' },
  { id: 'filter-node', name: 'Filter nodes', category: 'Navigation', subtitle: 'This demo filters nodes by keyword and preserves the path to each match.' },
  { id: 'report-path', name: 'Reporting path', category: 'Navigation', subtitle: 'This demo lets you select a node and then draw the reporting path back through its management chain.' },
  { id: 'get-related-nodes', name: 'Related nodes', category: 'Navigation', subtitle: "This demo highlights the selected node's parent, siblings, and children." },
  { id: 'edit-chart', name: 'Edit chart', category: 'Editing', subtitle: 'This demo uses the edit panel to add parent, child, and sibling nodes, delete nodes, and reset the chart state.' },
  { id: 'edit-hybrid-chart', name: 'Edit hybrid chart', category: 'Editing', subtitle: 'This demo applies the same add, delete, and reset editing flow to a hybrid horizontal and vertical chart.' },
  { id: 'drag-drop', name: 'Drag and drop', category: 'Editing', subtitle: 'This demo enables node drag and drop and uses dropCriteria to reject invalid moves between branches.' },
  { id: 'drag-drop-hybrid-chart', name: 'Drag and drop hybrid chart', category: 'Editing', subtitle: 'This demo applies drag and drop to a hybrid chart that mixes horizontal and vertical descendant branches.' },
  { id: 'get-hierarchy', name: 'Get hierarchy', category: 'Editing', subtitle: 'This demo exports the current chart as nested JSON with getHierarchy().' },
  { id: 'get-flat-datasource', name: 'Get flat datasource', category: 'Editing', subtitle: 'This demo exports current node data as flat records with parent_id references that reflect the current chart structure.' },
  { id: 'color-coded', name: 'Color-coded chart', category: 'Customization', subtitle: 'This demo assigns branch-specific class names so different departments can be styled with different colors.' },
  { id: 'option-createNode', name: 'createNode callback', category: 'Customization', subtitle: 'This demo uses the createNode callback to customize each node after it is created.' },
  { id: 'custom-template', name: 'Custom template', category: 'Customization', subtitle: 'This demo customizes the markup rendered inside each node.' },
  { id: 'custom-icons', name: 'Custom icons', category: 'Customization', subtitle: 'This demo replaces the built-in chart navigation icons with custom icons.' },
  { id: 'export-chart', name: 'Export PNG', category: 'Export', subtitle: 'This demo enables the built-in export button so the current chart can be saved as an image file.' },
  { id: 'export-chart-pdf', name: 'Export PDF', category: 'Export', subtitle: 'This demo enables the export button and routes the chart export flow to PDF output.' },
  { id: 'export-chart-with-pictures', name: 'Export with pictures', category: 'Export', kind: 'portraits', subtitle: 'This demo exports a chart whose nodes include avatars and richer custom content.' },
  { id: 'family-tree', name: 'Family tree', category: 'Family trees', kind: 'family', subtitle: 'This demo uses the family-tree datasource format to render spouses, descendants, and pedigree relationships.' },
  { id: 'family-tree-with-flat-datasource', name: 'Family tree from flat records', category: 'Family trees', kind: 'family', subtitle: 'This demo recreates the original four-generation family tree from flat, database-style records, preserving portraits, spouse groups, and descendant relationships.' },
  { id: 'familytree-custom-properties', name: 'Family tree properties', category: 'Family trees', kind: 'family-tags', subtitle: 'This demo extends the family-tree layout with custom relationship properties such as gender, ex, and adopted markers.' },
  { id: 'integrate-map', name: 'Map integration', category: 'Integration', kind: 'map', subtitle: 'This demo links the org chart to a map that recenters when users select a node with geographic coordinates.' },
  { id: 'options-compact-drag', name: 'Compact layout and drag', category: 'Combinations', subtitle: 'Mixed options: compact layout, drag and drop criteria, pan and zoom.' },
  { id: 'options-export-navigation', name: 'Export and navigation', category: 'Combinations', subtitle: 'Mixed options: bottom-to-top layout, custom fields, styling, pan, zoom and PDF export.' },
  { id: 'options-horizontal-template', name: 'Horizontal layout and template', category: 'Combinations', subtitle: 'Mixed options: horizontal layout, custom fields, template, icons and sibling toggles.' },
  { id: 'options-hybrid-navigation', name: 'Hybrid layout and navigation', category: 'Combinations', subtitle: 'Mixed options: hybrid layout, visible depth, sibling toggles, pan, zoom and minimap.' },
]
export function company(): OrgNode {
  return { id: '1', name: 'Lao Lao', title: 'General manager', city: 'Shanghai', coordinates: [121.47, 31.23], children: [
    { id: '2', name: 'Bo Miao', title: 'Department manager', className: 'department-product', city: 'London', coordinates: [-.12, 51.5], children: [{ id: '4', name: 'Tie Hua', title: 'Senior engineer' }, { id: '5', name: 'Hei Hei', title: 'Senior engineer', children: [{ id: '6', name: 'Pang Pang', title: 'Engineer' }, { id: '7', name: 'Xiang Xiang', title: 'UX engineer' }] }] },
    { id: '3', name: 'Su Miao', title: 'Department manager', className: 'department-research', city: 'New York', coordinates: [-74, 40.71], children: [{ id: '8', name: 'Hong Miao', title: 'Researcher' }, { id: '9', name: 'Chun Miao', title: 'Designer' }] },
  ] }
}
export const reloadDatasources: OrgNode[] = [
  company(),
  { id: '3', name: 'Su Miao', title: 'Department manager', children: [
    { id: '4', name: 'Tie Hua', title: 'Senior engineer' },
    { id: '5', name: 'Hei Hei', title: 'Senior engineer' },
  ] },
  { id: '5', name: 'Hei Hei', title: 'Senior engineer', children: [
    { id: '6', name: 'Pang Pang', title: 'Engineer' },
    { id: '10', name: 'Dan Zai', title: 'UX engineer' },
    { id: '11', name: '2Dan Zai', title: 'UX engineer' },
  ] },
]
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
  if (id === 'vertical-level') {
    options.verticalLevel = 3; options.visibleLevel = 4
    data = { id: '1', name: 'Lao Lao', title: 'general manager', children: [
      { id: '2', name: 'Bo Miao', title: 'department manager' },
      { id: '3', name: 'Su Miao', title: 'department manager', children: [
        { id: '4', name: 'Tie Hua', title: 'senior engineer' },
        { id: '5', name: 'Hei Hei', title: 'senior engineer', children: [
          { id: '6', name: 'Pang Pang', title: 'engineer' },
          { id: '7', name: 'Dan Dan', title: 'UE engineer', children: [
            { id: '8', name: 'Er Dan', title: 'engineer' },
            { id: '9', name: 'San Dan', title: 'engineer', children: [
              { id: '10', name: 'Si Dan', title: 'intern' },
              { id: '11', name: 'Wu Dan', title: 'intern' },
            ] },
          ] },
        ] },
      ] },
      { id: '12', name: 'Hong Miao', title: 'department manager' },
      { id: '13', name: 'Chun Miao', title: 'department manager', children: [
        { id: '14', name: 'Bing Qin', title: 'senior engineer' },
        { id: '15', name: 'Yue Yue', title: 'senior engineer', children: [
          { id: '16', name: 'San Yue', title: 'engineer' },
          { id: '17', name: 'Si Yue', title: 'UE engineer' },
          { id: '18', name: 'Er Yue', title: 'senior engineer' },
        ] },
      ] },
    ] }
  }
  if (id === 'edit-hybrid-chart' || id === 'drag-drop-hybrid-chart' || id === 'options-hybrid-navigation') options.verticalLevel = 2
  if (id === 'data-prop-hybrid') children[0]!.hybrid = true
  if (id === 'data-prop-compact') children[0]!.compact = true
  if (id === 'options-compact-drag') options.compact = node => node.id === '2'
  if (id === 'default-collapsed') children[0]!.collapsed = true
  if (id === 'expand-to-given-depth') options.visibleLevel = 2
  if (id === 'toggle-sibs-resp') options.toggleSiblingsResp = true
  if (id === 'level-offset') data = {
    id: '1', name: 'Lao Lao', title: 'general manager', children: [
      { id: '2', name: 'Bo Miao', title: 'department manager', levelOffset: 1 },
      { id: '3', name: 'Su Miao', title: 'department manager', children: [
        { id: '4', name: 'Tie Hua', title: 'senior engineer' },
        { id: '5', name: 'Hei Hei', title: 'senior engineer', children: [{ id: '6', name: 'Dan Dan', title: 'engineer' }] },
        { id: '7', name: 'Pang Pang', title: 'senior engineer', levelOffset: 1 },
      ] },
      { id: '8', name: 'Hong Miao', title: 'department manager', levelOffset: 2 },
    ],
  }
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