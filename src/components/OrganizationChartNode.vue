<script setup lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Users } from '@lucide/vue'
import type { Box } from './layout'
import type { NormalizedNode } from './types'
import type { ChartContext } from './useChart'
const props = defineProps<{ entry: NormalizedNode; context: ChartContext }>()
const node = ref<HTMLElement | null>(null); const hovered = ref(false); const focused = ref(false)
const pointerFocused = ref(false)
const options = computed(() => props.context.options.value)
const active = computed(() => hovered.value || (focused.value && !pointerFocused.value))
const childOwner = computed(() => { props.context.revision.value; return props.context.owner(props.entry) })
const hasChildren = computed(() => { props.context.revision.value; return childOwner.value.children.length > 0 })
const childrenVisible = computed(() => { props.context.revision.value; return props.context.getNodeState(childOwner.value.key, 'children').visible })
const mode = computed(() => props.context.layout.value.modes.get(props.entry.key))
const compactControlLabel = computed(() => childrenVisible.value ? 'Use compact layout' : 'Expand compact layout')
const parentVisible = computed(() => { props.context.revision.value; return props.context.getNodeState(props.entry.key, 'parent').visible })
type Edge = 'top' | 'bottom' | 'left' | 'right'
function arrow(edge: Edge, visible: boolean) {
  const sides = {
    t2b: { top: 'top', bottom: 'bottom', left: 'left', right: 'right' },
    b2t: { top: 'bottom', bottom: 'top', left: 'left', right: 'right' },
    l2r: { top: 'left', bottom: 'right', left: 'top', right: 'bottom' },
    r2l: { top: 'right', bottom: 'left', left: 'top', right: 'bottom' },
  } as const
  const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const
  const icons = { top: [ChevronUp, 'expandToUp'], bottom: [ChevronDown, 'collapseToDown'], left: [ChevronLeft, 'collapseToLeft'], right: [ChevronRight, 'expandToRight'] } as const
  const side = sides[options.value.direction][edge]
  const [icon, customIcon] = icons[visible ? opposite[side] : side]
  return { edge: `oc-edge-${side}`, icon, customIcon: options.value.icons?.[customIcon] }
}
const controls = computed(() => ({
  parent: arrow('top', parentVisible.value),
  children: arrow('bottom', childrenVisible.value),
  left: arrow('left', props.context.siblingGroups(props.entry, options.value.toggleSiblingsResp ? 'left' : undefined).flat().some(props.context.nodeVisible)),
  right: arrow('right', props.context.siblingGroups(props.entry, options.value.toggleSiblingsResp ? 'right' : undefined).flat().some(props.context.nodeVisible)),
}))
const position = computed<Pick<Box, 'x' | 'y'> | undefined>(previous => {
  const next = props.context.layout.value.boxes.get(props.entry.key)
  return previous && next && previous.x === next.x && previous.y === next.y ? previous : next
})
const motion = computed(() => props.context.relationMotions.value.get(props.entry.key) ?? 'children')
const lastPosition = shallowRef(position.value)
watch(position, value => { if (value) lastPosition.value = value }, { flush: 'sync' })
const style = computed(() => ({ left: `${(position.value ?? lastPosition.value)?.x ?? 0}px`, top: `${(position.value ?? lastPosition.value)?.y ?? 0}px`, width: props.entry.data.width ? `${props.entry.data.width}px` : undefined, minHeight: props.entry.data.height ? `${props.entry.data.height}px` : undefined }))
const template = computed(() => options.value.nodeTemplate?.(props.entry.data))
const CustomTemplate = defineComponent({ setup: () => () => typeof template.value === 'string' ? null : template.value ?? null })
function initialize() { if (node.value) options.value.createNode?.(node.value, props.entry.data) }
onMounted(() => { props.context.register(props.entry.key, node.value); initialize() })
onBeforeUnmount(() => props.context.register(props.entry.key, null))
watch(() => options.value.createNode, initialize)
function focusout(event: FocusEvent) {
  focused.value = event.relatedTarget instanceof Node && !!node.value?.contains(event.relatedTarget)
  if (!focused.value) pointerFocused.value = false
}
function keydown(event: KeyboardEvent) {
  if (event.target !== node.value) return
  const context = props.context
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); context.select(props.entry) }
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); if (hasChildren.value && !childrenVisible.value) context.toggleChildren(props.entry.key); else context.api.getChildren(childOwner.value.key)[0]?.focus() }
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); if (hasChildren.value && childrenVisible.value) context.toggleChildren(props.entry.key); else context.api.getParent(props.entry.key)?.focus() }
  if (event.key === 'Escape') { context.deselect(); context.dragEnd() }
}
</script>
<template>
  <Transition name="oc-branch" :css="!context.instantCompact.value" @after-leave="context.relationTransitionEnd(entry.key)" @leave-cancelled="context.relationTransitionEnd(entry.key)">
  <div ref="node" v-show="!!position" class="node" :class="[entry.data.className?.replace(/\bslide-up\b/g, ''), `oc-motion-${motion}`, { focused: context.selected.value === entry.key, 'oc-drop-target': context.dropTarget.value === entry.key, 'oc-dragging': context.dragging.value === entry.key, matched: context.keyword.value && String(entry.data[options.nodeTitle]).toLowerCase().includes(context.keyword.value.toLowerCase()) }]"
    :id="entry.data[options.nodeId] == null ? undefined : String(entry.data[options.nodeId])" :data-node-key="entry.key" :data-parent="entry.parentKey" :data-level="entry.depth" :data-layout="mode" :style="style"
    role="treeitem" :tabindex="position ? 0 : -1" :inert="!position" :aria-level="entry.depth" :aria-label="String(entry.data[options.nodeTitle] ?? entry.key)" :aria-expanded="hasChildren ? childrenVisible : undefined" :aria-selected="context.selected.value === entry.key" :aria-busy="context.loading.has(entry.key)" :aria-hidden="!position"
    :draggable="options.draggable ?? options.drag ?? false" @mouseenter="hovered = true" @mouseleave="hovered = false" @focusin="focused = true" @focusout="focusout" @click.stop="context.select(entry)" @keydown.capture="pointerFocused = false" @keydown="keydown" @dragstart="context.dragStart(entry, $event)" @dragover="context.dragOver(entry, $event)" @dragleave="context.dragLeave" @dragend="context.dragEnd" @drop="context.drop(entry, $event)" @pointerdown.capture="pointerFocused = true" @pointerdown="context.touchStart(entry, $event)">
    <slot :node-data="entry.data" :node="entry.data" :selected="context.selected.value === entry.key" :expanded="childrenVisible" :loading="context.loading.has(entry.key)">
      <div v-if="typeof template === 'string'" class="oc-custom-template" v-html="template" />
      <CustomTemplate v-else-if="template" />
      <template v-else>
        <div class="title"><i v-if="hasChildren && options.icons?.parentNode" :class="[options.icons.theme, options.icons.parentNode]" /><Users v-else-if="hasChildren" :size="14" aria-hidden="true" /><span>{{ entry.data[options.nodeTitle] }}</span></div>
        <div v-if="options.nodeContent && entry.data[options.nodeContent] != null" class="content">{{ entry.data[options.nodeContent] }}</div>
      </template>
    </slot>
    <div v-if="active && !context.keyword.value" class="oc-controls">
      <template v-if="mode !== 'compact'">
        <button v-if="entry.parentKey != null" type="button" class="oc-control topEdge" :class="controls.parent.edge" :aria-label="parentVisible ? 'Hide ancestors' : 'Show parent'" :title="parentVisible ? 'Hide ancestors' : 'Show parent'" @click.stop="context.toggleParent(entry.key)"><i v-if="controls.parent.customIcon" :class="[options.icons?.theme, controls.parent.customIcon]" /><component :is="controls.parent.icon" v-else :size="14" /></button>
        <button v-if="context.siblingGroups(entry, 'left').length" type="button" class="oc-control leftEdge horizontalEdge" :class="controls.left.edge" aria-label="Toggle left siblings" title="Toggle left siblings" @click.stop="context.toggleSiblings(entry.key, 'left')"><i v-if="controls.left.customIcon" :class="[options.icons?.theme, controls.left.customIcon]" /><component :is="controls.left.icon" v-else :size="14" /></button>
        <button v-if="context.siblingGroups(entry, 'right').length" type="button" class="oc-control rightEdge horizontalEdge" :class="controls.right.edge" aria-label="Toggle right siblings" title="Toggle right siblings" @click.stop="context.toggleSiblings(entry.key, 'right')"><i v-if="controls.right.customIcon" :class="[options.icons?.theme, controls.right.customIcon]" /><component :is="controls.right.icon" v-else :size="14" /></button>
      </template>
      <button v-if="mode === 'compact' && hasChildren && !options.icons?.collapsed" type="button" class="oc-control oc-compact-toggle" :aria-expanded="childrenVisible" :aria-label="compactControlLabel" :title="compactControlLabel" @click.stop="context.toggleChildren(entry.key)" />
      <button v-else-if="hasChildren" type="button" class="oc-control bottomEdge" :class="controls.children.edge" :aria-expanded="childrenVisible" :aria-label="childrenVisible ? 'Collapse children' : 'Expand children'" :title="childrenVisible ? 'Collapse children' : 'Expand children'" @click.stop="context.toggleChildren(entry.key)"><i v-if="options.icons?.collapsed" :class="[options.icons.theme, childrenVisible ? options.icons.expanded : options.icons.collapsed]" /><i v-else-if="controls.children.customIcon" :class="[options.icons?.theme, controls.children.customIcon]" /><component :is="controls.children.icon" v-else :size="14" /></button>
    </div>
  </div>
  </Transition>
</template>
