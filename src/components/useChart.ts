import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, toRaw, watch } from 'vue'
import { ChartModel, cloneData } from './tree'
import { layoutChart, type Layout } from './layout'
import { resolveOptions, visibleDepth } from './options'
import { captureChart, exportPDF, exportPNG } from './export'
import type { ChartEvent, ChartOptions, Datasource, NodeId, NodeRef, NormalizedNode, OrgNode, Relation } from './types'

export function useChart(props: ChartOptions, emit: (event: ChartEvent, ...args: unknown[]) => void) {
  const overrides = shallowRef<ChartOptions>({})
  const options = computed(() => resolveOptions({ ...props, ...overrides.value, icons: { ...props.icons, ...overrides.value.icons } }))
  const model = shallowRef(new ChartModel(props.data ?? props.datasource ?? null, options.value.nodeId))
  const revision = ref(0)
  const host = ref<HTMLElement | null>(null); const chart = ref<HTMLElement | null>(null)
  const disposed = ref(false); const selected = ref<string | null>(null)
  const collapsed = reactive(new Set<string>()); const hiddenBranches = reactive(new Set<string>()); const hiddenNodes = reactive(new Set<string>())
  const zeroHidden = ref(false); const keyword = ref('')
  const sizes = shallowRef(new Map<string, { width: number; height: number }>())
  const elements = new Map<string, HTMLElement>()
  const viewport = reactive({ x: 0, y: 0, scale: 1 })
  const dimensions = reactive({ width: 0, height: 0, scrollLeft: 0, scrollTop: 0 })
  const exporting = ref(false); const loading = reactive(new Set<string>()); const requests = new Map<string, AbortController>()
  let lastPublished: Datasource = null
  let initialPosition = true
  const dragging = ref<string | null>(null); const dropTarget = ref<string | null>(null); const panning = ref(false)
  const relating = ref(false)
  type RelationMotion = 'children' | 'parent' | 'left' | 'right'
  const relationMotions = shallowRef(new Map<string, RelationMotion>())
  const leavingRelations = shallowRef<{ layout: Layout; anchor: string; keys: Set<string>; preserveAnchor: boolean } | null>(null)
  let relationRevision = 0
  const allNodes = computed(() => { revision.value; return [...model.value.nodes.values()] })
  const retained = computed(() => {
    const result = new Set<string>()
    if (keyword.value) for (const node of allNodes.value) if (Object.values(node.data).some(value => typeof value === 'string' && value.toLowerCase().includes(keyword.value.toLowerCase()))) {
      result.add(node.key)
      for (const ancestor of model.value.ancestors(node)) result.add(ancestor.key)
      for (const member of model.value.groups(node).find(group => group.includes(node)) ?? []) result.add(member.key)
    }
    return result
  })
  function branchVisible(node: NormalizedNode): boolean {
    if (disposed.value || zeroHidden.value) return false
    if (keyword.value) return retained.value.has(node.key)
    return !hiddenBranches.has(node.key) && model.value.ancestors(node).every(parent => !hiddenBranches.has(parent.key) && !collapsed.has(parent.key))
  }
  function nodeVisible(node: NormalizedNode) { return branchVisible(node) && (!!keyword.value || !hiddenNodes.has(node.key)) }
  function expanded(node: NormalizedNode) { return branchVisible(node) && (!!keyword.value || !collapsed.has(node.key)) }
  const targetLayout = computed(() => { revision.value; return layoutChart(model.value, options.value, nodeVisible, expanded, sizes.value) })
  const layout = computed(() => {
    const target = targetLayout.value; const leaving = leavingRelations.value
    if (!leaving) return target
    const links = new Set(target.links.map(link => link.key))
    return { ...leaving.layout, boxes: new Map([...leaving.layout.boxes].filter(([key]) => target.boxes.has(key))), links: leaving.layout.links.filter(link => links.has(link.key)) }
  })
  const horizontalOffset = computed(() => Math.max(0, (dimensions.width - layout.value.width * viewport.scale) / 2))
  const transform = computed(() => `translate(${horizontalOffset.value + viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`)
  const minimapViewport = computed(() => ({ x: Math.max(0, (dimensions.scrollLeft - horizontalOffset.value - viewport.x) / viewport.scale), y: Math.max(0, (dimensions.scrollTop - viewport.y) / viewport.scale), width: Math.min(layout.value.width, dimensions.width / viewport.scale), height: Math.min(layout.value.height, dimensions.height / viewport.scale) }))
  let observer: ResizeObserver | undefined; let frame: number | undefined; let touchTimer: ReturnType<typeof setTimeout> | undefined
  const pointers = new Map<number, { x: number; y: number }>()
  let gesture: { x: number; y: number; originX: number; originY: number } | null = null
  let pinchDistance = 0
  let suppressBackgroundClick = false
  let mapGesture: { x: number; y: number; originX: number; originY: number; ratio: number } | null = null
  function cancelRelationTransition() { relationRevision++; leavingRelations.value = null; relationMotions.value = new Map(); relating.value = false }
  function initializeVisibility() {
    cancelRelationTransition()
    collapsed.clear(); hiddenBranches.clear(); hiddenNodes.clear(); keyword.value = ''
    const depth = visibleDepth(options.value.visibleLevel); zeroHidden.value = depth === 0
    for (const node of allNodes.value) if (node.data.collapsed || node.depth >= depth || node.children.some(group => group.some(child => child.data.className?.split(' ').includes('slide-up')))) collapsed.add(node.key)
  }
  initializeVisibility()
  function element(reference: NodeRef) { return elements.get(model.value.resolve(reference).key) ?? null }
  function relatedElements(reference: NodeRef, relation: Relation) { return model.value.related(model.value.resolve(reference), relation).map(node => element(node.key)).filter((node): node is HTMLElement => !!node) }
  function getParent(reference: NodeRef) { return relatedElements(reference, 'parent')[0] ?? null }
  function getChildren(reference: NodeRef) { return relatedElements(reference, 'children') }
  function getSiblings(reference: NodeRef) { return relatedElements(reference, 'siblings') }
  function getRelatedNodes(reference: NodeRef, relation: Relation) { return relation === 'parent' ? getParent(reference) : relatedElements(reference, relation) }
  function getNodeState(reference: NodeRef, relation?: Relation) {
    const node = model.value.resolve(reference); const nodes = relation ? model.value.related(node, relation) : [node]
    return { exist: nodes.length > 0, visible: nodes.some(nodeVisible) }
  }
  function owner(node: NormalizedNode) { return node.children.length ? node : (model.value.groups(node).find(group => group.includes(node))?.find(member => member.children.length) ?? node) }
  function visibilityEvent(node: NormalizedNode, relation: Relation, visible: boolean) {
    const detail = { node: cloneData(node.data), relation }; emit(visible ? 'show' : 'hide', detail)
    chart.value?.dispatchEvent(new CustomEvent(`${visible ? 'show' : 'hide'}-${relation}.orgchart`, { detail }))
  }
  function reflowRelations(previous: Layout, anchor: string, preserveAnchor: boolean) {
    const before = model.value.nodes.has(anchor) ? element(anchor)?.getBoundingClientRect() : undefined; const previousBox = previous.boxes.get(anchor)
    const previousOffset = Math.max(0, (dimensions.width - previous.width * viewport.scale) / 2)
    leavingRelations.value = null
    const box = layout.value.boxes.get(anchor)
    if (preserveAnchor && previousBox && box) { viewport.x += previousOffset - horizontalOffset.value + (previousBox.x - box.x) * viewport.scale; viewport.y += (previousBox.y - box.y) * viewport.scale }
    const version = ++relationRevision
    nextTick(() => {
      if (version !== relationRevision || disposed.value) return
      const after = model.value.nodes.has(anchor) ? element(anchor)?.getBoundingClientRect() : undefined
      if (preserveAnchor && host.value?.clientWidth && before && after) { viewport.x += before.x - after.x; viewport.y += before.y - after.y }
      nextTick(() => { if (version === relationRevision) { relating.value = false; updateMinimap() } })
    })
  }
  function changeRelations(anchor: string, change: () => void, motions = new Map<string, RelationMotion>(), preserveAnchor = false) {
    const previous = leavingRelations.value?.layout ?? layout.value
    relationMotions.value = new Map([...relationMotions.value, ...motions])
    relating.value = true; relationRevision++
    leavingRelations.value = { layout: previous, anchor, keys: new Set(), preserveAnchor }
    change()
    const keys = new Set([...previous.boxes.keys()].filter(key => !targetLayout.value.boxes.has(key)))
    if (keys.size && host.value?.isConnected && host.value.clientWidth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) leavingRelations.value = { layout: previous, anchor, keys, preserveAnchor }
    else reflowRelations(previous, anchor, preserveAnchor)
  }
  function relationTransitionEnd(key: string) {
    const leaving = leavingRelations.value
    if (leaving?.keys.delete(key) && !leaving.keys.size) reflowRelations(leaving.layout, leaving.anchor, leaving.preserveAnchor)
  }
  function visitBranch(node: NormalizedNode, visit: (member: NormalizedNode) => void) {
    visit(node)
    for (const group of node.children) for (const child of group) visitBranch(child, visit)
  }
  function childMotions(node: NormalizedNode) {
    const motions = new Map<string, RelationMotion>()
    for (const group of node.children) for (const child of group) visitBranch(child, member => motions.set(member.key, 'children'))
    return motions
  }
  function siblingMotions(node: NormalizedNode, direction?: 'left' | 'right') {
    const motions = new Map<string, RelationMotion>()
    for (const side of ['left', 'right'] as const) if (!direction || side === direction) for (const member of siblingGroups(node, side).flat()) visitBranch(member, descendant => motions.set(descendant.key, side))
    return motions
  }
  function hideChildren(reference: NodeRef) {
    const node = owner(model.value.resolve(reference)); changeRelations(node.key, () => {
      visitBranch(node, descendant => { if (descendant.children.length) collapsed.add(descendant.key) })
      collapsed.add(node.key)
    }, childMotions(node), true)
    if (selected.value && model.value.ancestors(model.value.resolve(selected.value)).includes(node)) { selected.value = node.key; element(node.key)?.focus() }
    visibilityEvent(node, 'children', false)
  }
  function showChildren(reference: NodeRef) { const node = owner(model.value.resolve(reference)); changeRelations(node.key, () => { collapsed.delete(node.key); zeroHidden.value = false; model.value.children(node).forEach(child => hiddenBranches.delete(child.key)) }, childMotions(node), true); visibilityEvent(node, 'children', true) }
  function siblingGroups(node: NormalizedNode, direction?: 'left' | 'right') {
    const groups = model.value.groups(node); const index = groups.findIndex(group => group.includes(node))
    return groups.filter((_, groupIndex) => direction === 'left' ? groupIndex < index : direction === 'right' ? groupIndex > index : groupIndex !== index)
  }
  function collapseSibling(member: NormalizedNode) {
    hiddenBranches.add(member.key)
    visitBranch(member, descendant => { if (descendant.children.length) collapsed.add(descendant.key) })
  }
  function hideSiblings(reference: NodeRef, direction?: 'left' | 'right') { const node = model.value.resolve(reference); changeRelations(node.key, () => siblingGroups(node, direction).flat().forEach(collapseSibling), siblingMotions(node, direction)); visibilityEvent(node, 'siblings', false) }
  function showSiblings(reference: NodeRef, direction?: 'left' | 'right') {
    const node = model.value.resolve(reference)
    const parent = model.value.parent(node)
    const motions = siblingMotions(node, direction)
    const parents = parent ? model.value.groups(parent).find(group => group.includes(parent)) ?? [parent] : []
    parents.forEach(member => motions.set(member.key, 'parent'))
    changeRelations(node.key, () => {
      siblingGroups(node, direction).flat().forEach(member => hiddenBranches.delete(member.key))
      parents.forEach(member => hiddenNodes.delete(member.key))
    }, motions)
    visibilityEvent(node, 'siblings', true)
  }
  function hideParent(reference: NodeRef) {
    const selectedNode = model.value.resolve(reference)
    const motions = new Map<string, RelationMotion>()
    let node = selectedNode
    while (node.parentKey != null) {
      for (const [key, motion] of siblingMotions(node)) motions.set(key, motion)
      node = model.value.parent(node)!
      for (const member of model.value.groups(node).find(group => group.includes(node)) ?? [node]) motions.set(member.key, 'parent')
    }
    changeRelations(selectedNode.key, () => {
      node = selectedNode
      while (node.parentKey != null) {
        siblingGroups(node).flat().forEach(collapseSibling); node = model.value.parent(node)!
        for (const member of model.value.groups(node).find(group => group.includes(node)) ?? [node]) hiddenNodes.add(member.key)
        collapsed.delete(node.key)
      }
    }, motions)
    visibilityEvent(selectedNode, 'parent', false)
  }
  function showParent(reference: NodeRef) {
    const node = model.value.resolve(reference); const parent = model.value.parent(node)
    const parents = parent ? model.value.groups(parent).find(group => group.includes(parent)) ?? [parent] : []
    changeRelations(node.key, () => parents.forEach(member => hiddenNodes.delete(member.key)), new Map(parents.map(member => [member.key, 'parent'])))
    visibilityEvent(node, 'parent', true)
  }
  function toggleChildren(reference: NodeRef) { const node = owner(model.value.resolve(reference)); if (getNodeState(node.key, 'children').visible) hideChildren(node.key); else showChildren(node.key) }
  function toggleParent(reference: NodeRef) { if (getNodeState(reference, 'parent').visible) hideParent(reference); else showParent(reference) }
  function toggleSiblings(reference: NodeRef, direction?: 'left' | 'right') { const node = model.value.resolve(reference); const side = options.value.toggleSiblingsResp ? direction : undefined; if (siblingGroups(node, side).flat().some(nodeVisible)) hideSiblings(reference, side); else showSiblings(reference, side) }
  function select(node: NormalizedNode) { selected.value = node.key; emit('node-click', cloneData(node.data)); emit('select', cloneData(node.data)) }
  function deselect() {
    if (selected.value == null) return
    selected.value = null
    emit('deselect')
  }
  function backgroundClick(event: MouseEvent) {
    if (suppressBackgroundClick && event.detail > 0) { suppressBackgroundClick = false; return }
    if (event.target instanceof Element && event.target.closest('.node')) return
    const activeElement = host.value?.ownerDocument.activeElement
    if (activeElement instanceof HTMLElement && host.value?.contains(activeElement) && activeElement.closest('.node')) activeElement.blur()
    deselect()
  }
  function publish() {
    cancelRelationTransition()
    revision.value++
    for (const key of [...collapsed, ...hiddenBranches, ...hiddenNodes]) if (!model.value.nodes.has(key)) { collapsed.delete(key); hiddenBranches.delete(key); hiddenNodes.delete(key) }
    const snapshot = model.value.snapshot(); lastPublished = snapshot; emit('update:data', snapshot); emit('update:datasource', snapshot); emit('change', snapshot); queueMinimap()
  }
  function addChildren(reference: NodeRef, data: OrgNode[] | OrgNode[][]) { model.value.addChildren(reference, data); collapsed.delete(model.value.resolve(reference).key); publish() }
  function addSiblings(reference: NodeRef, data: OrgNode[] | OrgNode[][]) { model.value.addSiblings(reference, data); publish() }
  function addParent(reference: NodeRef, data: OrgNode) { model.value.addParent(reference, data); publish() }
  function addAncestors(data: Datasource, parentId: NodeId) { model.value.addAncestors(data, parentId); publish() }
  function abortRequests() { requests.forEach(controller => controller.abort()); requests.clear(); loading.clear() }
  function removeNodes(reference: NodeRef) {
    const node = model.value.resolve(reference); const parent = node.parentKey
    const removed = [node, ...allNodes.value.filter(member => model.value.ancestors(member).includes(node))]
    for (const member of removed) { requests.get(member.key)?.abort(); requests.delete(member.key); loading.delete(member.key) }
    model.value.remove(reference)
    if (!model.value.nodes.size) { destroy(); emit('change', null); emit('update:data', null); emit('update:datasource', null); return }
    if (selected.value && removed.some(member => member.key === selected.value)) { selected.value = parent; nextTick(() => { if (parent) element(parent)?.focus() }) }
    publish()
  }
  function canDrop(reference: NodeRef, target: NodeRef) { if (!model.value.canMove(reference, target)) return false; const dragged = element(reference); const destination = element(target); return !!dragged && !!destination && (!options.value.dropCriteria || options.value.dropCriteria(dragged, getParent(reference), destination)) }
  function moveNode(reference: NodeRef, target: NodeRef) {
    if (!canDrop(reference, target)) throw new Error('Drop rejected')
    const detail = { draggedNode: cloneData(model.value.resolve(reference).data), dropZone: cloneData(model.value.resolve(target).data) }
    model.value.move(reference, target); collapsed.delete(model.value.resolve(target).key); publish(); emit('node-drop', detail)
    chart.value?.dispatchEvent(new CustomEvent('nodedrop.orgchart', { detail }))
  }
  function dragStart(node: NormalizedNode, event: DragEvent) {
    if (!(options.value.draggable ?? options.value.drag) || (!node.parentKey && !model.value.family)) { event.preventDefault(); return }
    dragging.value = node.key; selected.value = node.key; event.dataTransfer?.setData('text/plain', node.key); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }
  function dragOver(node: NormalizedNode, event: DragEvent) { if (dragging.value && canDrop(dragging.value, node.key)) { event.preventDefault(); dropTarget.value = node.key } }
  function dragLeave() { dropTarget.value = null }
  function dragEnd() { dragging.value = null; dropTarget.value = null; if (touchTimer) clearTimeout(touchTimer); touchTimer = undefined }
  function drop(node: NormalizedNode, event?: DragEvent) { event?.preventDefault(); if (dragging.value && canDrop(dragging.value, node.key)) moveNode(dragging.value, node.key); dragEnd() }
  function touchStart(node: NormalizedNode, event: PointerEvent) { if (event.pointerType !== 'touch' || !(options.value.draggable ?? options.value.drag) || (event.target as HTMLElement).closest('button, input, a')) return; if (touchTimer) clearTimeout(touchTimer); touchTimer = setTimeout(() => { dragging.value = node.key; selected.value = node.key; gesture = null; panning.value = false; host.value?.setPointerCapture?.(event.pointerId) }, 350) }
  async function loadChildren(reference: NodeRef, loader: (data: OrgNode, signal: AbortSignal) => Promise<OrgNode[] | OrgNode[][]>) {
    const node = model.value.resolve(reference); if (loading.has(node.key)) return false
    const controller = new AbortController(); requests.set(node.key, controller); loading.add(node.key)
    try { const data = await loader(cloneData(node.data), controller.signal); if (controller.signal.aborted || disposed.value || !model.value.nodes.has(node.key)) return false; addChildren(node.key, data); emit('load', { node: cloneData(node.data), data }); return true }
    catch (error) { if (!controller.signal.aborted) { emit('load-error', { node: cloneData(node.data), error }); throw error } return false }
    finally { if (requests.get(node.key) === controller) { requests.delete(node.key); loading.delete(node.key) } }
  }
  function setOptions(input: ChartOptions | keyof ChartOptions, value?: unknown) {
    const patch = typeof input === 'string' ? { [input]: value } as ChartOptions : input
    const next = { ...overrides.value, ...patch, icons: { ...overrides.value.icons, ...patch.icons } }; const resolved = resolveOptions({ ...props, ...next })
    const replacing = 'data' in patch || 'datasource' in patch || ('nodeId' in patch && resolved.nodeId !== model.value.nodeId)
    const replacement = replacing ? new ChartModel('data' in patch ? patch.data ?? null : 'datasource' in patch ? patch.datasource ?? null : model.value.snapshot(), resolved.nodeId) : null
    overrides.value = next
    if (replacement) { abortRequests(); model.value = replacement; disposed.value = false; selected.value = null; sizes.value = new Map(); initialPosition = true; revision.value++; initializeVisibility() }
    else if ('visibleLevel' in patch) initializeVisibility()
    viewport.scale = Math.min(resolved.zoominLimit, Math.max(resolved.zoomoutLimit, viewport.scale)); if (!resolved.pan) { panning.value = false; gesture = null }
    nextTick(() => { observe(); updateMinimap() }); return api
  }
  function init(input: ChartOptions = {}) {
    setOptions(input)
    if (disposed.value) { disposed.value = false; model.value = new ChartModel(input.data ?? input.datasource ?? overrides.value.data ?? overrides.value.datasource ?? props.data ?? props.datasource ?? null, options.value.nodeId); revision.value++ }
    initializeVisibility(); dragEnd(); pointers.clear(); selected.value = null; initialPosition = true
    nextTick(() => { observe(); emit('init', chart.value); if (chart.value) options.value.initCompleted?.(chart.value) }); return api
  }
  watch(() => props.data ?? props.datasource, source => { if (source != null && toRaw(source) === lastPublished) return; const replacement = new ChartModel(source ?? null, options.value.nodeId); abortRequests(); model.value = replacement; disposed.value = false; sizes.value = new Map(); initialPosition = true; revision.value++; initializeVisibility(); if (selected.value && !model.value.nodes.has(selected.value)) selected.value = null; nextTick(observe) }, { deep: true })
  watch(() => [props.visibleLevel, props.nodeId], () => { if (model.value.nodeId !== options.value.nodeId) model.value = new ChartModel(model.value.snapshot(), options.value.nodeId); initializeVisibility(); revision.value++ })
  watch(() => [options.value.zoomoutLimit, options.value.zoominLimit], () => { viewport.scale = Math.min(options.value.zoominLimit, Math.max(options.value.zoomoutLimit, viewport.scale)) })
  function setChartScale(chartOrMultiplier: HTMLElement | number | null, multiplierOrAnchor?: number | { x: number; y: number }, anchor?: { x: number; y: number }) {
    const multiplier = typeof chartOrMultiplier === 'number' ? chartOrMultiplier : multiplierOrAnchor as number; const point = typeof multiplierOrAnchor === 'object' ? multiplierOrAnchor : anchor
    if (!Number.isFinite(multiplier) || multiplier <= 0) return
    const previous = viewport.scale; const scale = Math.min(options.value.zoominLimit, Math.max(options.value.zoomoutLimit, previous * multiplier))
    if (point) { viewport.x = point.x + dimensions.scrollLeft - (point.x + dimensions.scrollLeft - horizontalOffset.value - viewport.x) * scale / previous - Math.max(0, (dimensions.width - layout.value.width * scale) / 2); viewport.y = point.y + dimensions.scrollTop - (point.y + dimensions.scrollTop - viewport.y) * scale / previous }
    viewport.scale = scale; emit('zoom', { ...viewport }); queueMinimap()
  }
  function wheel(event: WheelEvent, minimap = false) { if (!options.value.zoom && !minimap) return; event.preventDefault(); const bounds = host.value?.getBoundingClientRect(); setChartScale(event.deltaY > 0 ? 0.8 : 1.2, minimap ? { x: dimensions.width / 2, y: dimensions.height / 2 } : { x: event.clientX - (bounds?.left ?? 0), y: event.clientY - (bounds?.top ?? 0) }) }
  function pointerDown(event: PointerEvent) {
    if (!pointers.size) suppressBackgroundClick = false
    if (event.button > 0 || (!(options.value.pan || options.value.zoom) && !dragging.value)) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 2 && options.value.zoom) { suppressBackgroundClick = true; if (touchTimer) clearTimeout(touchTimer); touchTimer = undefined; const points = [...pointers.values()]; pinchDistance = Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y); gesture = null; panning.value = false }
    else if (options.value.pan && !(event.target as HTMLElement).closest('.node,button,a,input')) { gesture = { x: event.clientX, y: event.clientY, originX: viewport.x, originY: viewport.y }; panning.value = true }
    if (gesture || pointers.size === 2) host.value?.setPointerCapture?.(event.pointerId)
  }
  function pointerMove(event: PointerEvent) {
    if (dragging.value && event.pointerType === 'touch') { event.preventDefault(); const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('.node'); dropTarget.value = target?.dataset.nodeKey && canDrop(dragging.value, target.dataset.nodeKey) ? target.dataset.nodeKey : null; return }
    const previous = pointers.get(event.pointerId); if (!previous) return
    if (touchTimer && Math.hypot(previous.x - event.clientX, previous.y - event.clientY) > 8) { clearTimeout(touchTimer); touchTimer = undefined }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 2 && options.value.zoom) { const points = [...pointers.values()]; const distance = Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y); const bounds = host.value?.getBoundingClientRect(); if (pinchDistance > 0 && distance > 0) setChartScale(distance / pinchDistance, { x: (points[0]!.x + points[1]!.x) / 2 - (bounds?.left ?? 0), y: (points[0]!.y + points[1]!.y) / 2 - (bounds?.top ?? 0) }); pinchDistance = distance }
    else if (gesture) { if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 4) suppressBackgroundClick = true; viewport.x = gesture.originX + event.clientX - gesture.x; viewport.y = gesture.originY + event.clientY - gesture.y; emit('pan', { ...viewport }); queueMinimap() }
  }
  function pointerUp(event: PointerEvent) { if (dragging.value && event.pointerType === 'touch' && dropTarget.value) drop(model.value.resolve(dropTarget.value)); if (event.pointerType === 'touch') dragEnd(); pointers.delete(event.pointerId); pinchDistance = 0; gesture = null; panning.value = false; if (host.value?.hasPointerCapture?.(event.pointerId)) host.value.releasePointerCapture(event.pointerId) }
  function resetView() { viewport.x = 0; viewport.y = 0; viewport.scale = Math.min(options.value.zoominLimit, Math.max(options.value.zoomoutLimit, 1)); if (host.value) { host.value.scrollLeft = 0; host.value.scrollTop = 0 } updateMinimap() }
  function centerOnNode(reference: NodeRef) {
    const node = model.value.resolve(reference); for (const ancestor of model.value.ancestors(node)) { collapsed.delete(ancestor.key); hiddenNodes.delete(ancestor.key); hiddenBranches.delete(ancestor.key) } hiddenBranches.delete(node.key); hiddenNodes.delete(node.key); zeroHidden.value = false
    nextTick(() => { const box = layout.value.boxes.get(node.key); if (box) { viewport.x = dimensions.width / 2 - horizontalOffset.value - (box.x + box.width / 2) * viewport.scale + dimensions.scrollLeft; viewport.y = dimensions.height / 2 - (box.y + box.height / 2) * viewport.scale + dimensions.scrollTop; queueMinimap() } })
  }
  function expandAll(depth = 999) { if (!Number.isInteger(depth) || depth < 0) throw new RangeError('Invalid expansion depth'); const root = model.value.roots[0]?.[0]; changeRelations(root?.key ?? '', () => { zeroHidden.value = depth === 0; collapsed.clear(); hiddenBranches.clear(); hiddenNodes.clear(); for (const node of allNodes.value) if (node.depth >= depth) collapsed.add(node.key) }, new Map(allNodes.value.map(node => [node.key, 'children'])), true) }
  function collapseAll() { expandAll(1) }
  function filterNodes(value: string) { keyword.value = value.trim() }
  function clearFilter() { keyword.value = '' }
  function getPath(reference: NodeRef) { const node = model.value.resolve(reference); return [...model.value.ancestors(node).reverse(), node].map(member => cloneData(member.data)) }
  function updateMinimap(_forceRefresh = false) { if (host.value) { dimensions.width = host.value.clientWidth; dimensions.height = host.value.clientHeight; dimensions.scrollLeft = host.value.scrollLeft; dimensions.scrollTop = host.value.scrollTop } }
  function queueMinimap() { if (frame == null && typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(() => { frame = undefined; if (!disposed.value) updateMinimap() }) }
  function minimapDown(event: PointerEvent) {
    event.preventDefault(); const map = event.currentTarget as SVGSVGElement; const bounds = map.getBoundingClientRect(); const ratio = Math.min(bounds.width / layout.value.width, bounds.height / layout.value.height)
    const insetX = (bounds.width - layout.value.width * ratio) / 2; const insetY = (bounds.height - layout.value.height * ratio) / 2
    if (!(event.target as Element).classList.contains('oc-minimap-viewport') && ratio > 0) { viewport.x = dimensions.width / 2 - horizontalOffset.value - (event.clientX - bounds.left - insetX) / ratio * viewport.scale + dimensions.scrollLeft; viewport.y = dimensions.height / 2 - (event.clientY - bounds.top - insetY) / ratio * viewport.scale + dimensions.scrollTop }
    mapGesture = { x: event.clientX, y: event.clientY, originX: viewport.x, originY: viewport.y, ratio }; map.setPointerCapture?.(event.pointerId)
  }
  function minimapMove(event: PointerEvent) { if (mapGesture && mapGesture.ratio > 0) { viewport.x = mapGesture.originX - (event.clientX - mapGesture.x) / mapGesture.ratio * viewport.scale; viewport.y = mapGesture.originY - (event.clientY - mapGesture.y) / mapGesture.ratio * viewport.scale; queueMinimap() } }
  function minimapUp(event: PointerEvent) { mapGesture = null; const target = event.currentTarget as Element; if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId) }
  function register(key: string, node: HTMLElement | null) { if (node) { elements.set(key, node); observer?.observe(node) } else { const previous = elements.get(key); if (previous) observer?.unobserve(previous); elements.delete(key) } }
  function observe() {
    if (disposed.value) return
    if (typeof ResizeObserver !== 'undefined' && !observer) observer = new ResizeObserver(entries => {
      const measurements = new Map(sizes.value); let changed = false
      for (const entry of entries) { const node = entry.target as HTMLElement; const key = node.dataset.nodeKey; if (key && node.offsetWidth && node.offsetHeight) { const previous = measurements.get(key); if (previous?.width !== node.offsetWidth || previous?.height !== node.offsetHeight) { measurements.set(key, { width: node.offsetWidth, height: node.offsetHeight }); changed = true } } }
      if (changed) sizes.value = measurements; queueMinimap()
      if (initialPosition) nextTick(() => {
        const container = host.value; const root = model.value.roots[0]?.[0]; const box = root && layout.value.boxes.get(root.key)
        if (!initialPosition || disposed.value || !container?.clientWidth || !box) return
        initialPosition = false
        container.scrollLeft = Math.max(0, (box.x + box.width / 2) * viewport.scale + horizontalOffset.value + viewport.x - container.clientWidth / 2)
        container.scrollTop = Math.max(0, (box.y + box.height / 2) * viewport.scale + viewport.y - container.clientHeight / 2)
        updateMinimap()
      })
    })
    if (host.value) observer?.observe(host.value); elements.forEach(node => observer?.observe(node)); updateMinimap()
  }
  async function exportChart(filename = options.value.exportFilename, extension: 'png' | 'pdf' = options.value.exportFileextension) {
    if (disposed.value || !chart.value || !model.value.nodes.size || exporting.value) return false
    if (!['png', 'pdf'].includes(extension)) throw new RangeError('Export extension must be png or pdf')
    exporting.value = true; const currentChart = chart.value
    try { await nextTick(); const canvas = await captureChart(currentChart, options.value, layout.value); if (disposed.value || chart.value !== currentChart) return false; if (extension === 'pdf') await exportPDF(canvas, filename, options.value.exportScale); else await exportPNG(canvas, filename); emit('export', { canvas, filename, extension }); return canvas }
    catch (error) { emit('export-error', { error }); currentChart.dispatchEvent(new CustomEvent('export-error.orgchart', { detail: { error } })); throw error }
    finally { exporting.value = false }
  }
  function destroy() { disposed.value = true; cancelRelationTransition(); abortRequests(); dragEnd(); pointers.clear(); gesture = null; mapGesture = null; panning.value = false; observer?.disconnect(); observer = undefined; if (frame != null) cancelAnimationFrame(frame); frame = undefined; model.value = new ChartModel(null, options.value.nodeId); selected.value = null; sizes.value = new Map(); revision.value++; return api }
  const api = {
    get chart() { return disposed.value ? null : chart.value }, get chartContainer() { return host.value }, init, destroy, setOptions,
    attachMinimap: () => setOptions('minimap', true), detachMinimap: () => setOptions('minimap', false), updateMinimap,
    addAncestors, addDescendants: (data: OrgNode[] | OrgNode[][], parent: NodeRef) => addChildren(parent, data), addParent, addSiblings, addChildren, removeNodes,
    getHierarchy: (includeNodeData = false) => model.value.hierarchy(includeNodeData), getFlatDatasource: () => model.value.flat(), getNodeState, getParent, getChildren, getSiblings, getRelatedNodes,
    hideParent, showParent, hideChildren, showChildren, hideSiblings, showSiblings, setChartScale, export: exportChart, exportPNG, exportPDF,
    moveNode, loadChildren, expandAll, collapseAll, centerOnNode, resetView, filterNodes, clearFilter, getPath, getViewport: () => ({ ...viewport }), getNode: element,
  }
  onMounted(() => { viewport.scale = Math.min(options.value.zoominLimit, Math.max(options.value.zoomoutLimit, 1)); observe(); emit('init', chart.value); if (chart.value) options.value.initCompleted?.(chart.value) })
  onBeforeUnmount(destroy); watch(layout, () => nextTick(observe))
  return { api, options, model, revision, host, chart, disposed, selected, allNodes, layout, transform, viewport, dimensions, minimapViewport, exporting, loading, dragging, dropTarget, panning, relating, relationMotions, relationTransitionEnd, keyword, nodeVisible, owner, getNodeState, toggleChildren, toggleParent, toggleSiblings, siblingGroups, select, deselect, backgroundClick, dragStart, dragOver, dragLeave, dragEnd, drop, touchStart, wheel, pointerDown, pointerMove, pointerUp, minimapDown, minimapMove, minimapUp, updateMinimap, register }
}
export type ChartContext = ReturnType<typeof useChart>
export type OrgChartInstance = ChartContext['api']