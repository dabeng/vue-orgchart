<script setup lang="ts">
import { Download, LoaderCircle } from '@lucide/vue'
import OrganizationChartNode from './OrganizationChartNode.vue'
import { useChart } from './useChart'
import type { ChartOptions } from './types'
import './style.css'
defineOptions({ name: 'OrgChart' })
const props = withDefaults(defineProps<ChartOptions>(), { visibleLevel: 999, draggable: undefined, drag: undefined })
const emit = defineEmits(['node-click', 'select', 'deselect', 'change', 'update:data', 'update:datasource', 'init', 'show', 'hide', 'node-drop', 'load', 'load-error', 'zoom', 'pan', 'export', 'export-error'])
const context = useChart(props, emit)
const { host, chart, layout, options, allNodes, transform, viewport, disposed, minimapViewport, exporting, panning } = context
defineExpose(context.api)
function download() { context.api.export().catch(() => {}) }
</script>
<template>
  <div class="oc-shell">
    <slot name="toolbar" :chart="context.api" :viewport="viewport" />
    <div ref="host" class="orgchart-container" :class="{ 'oc-panning': panning }" :style="{ touchAction: options.pan || options.zoom || options.draggable || options.drag ? 'none' : 'auto' }" @click="context.backgroundClick" @wheel="context.wheel($event)" @pointerdown="context.pointerDown" @pointermove="context.pointerMove" @pointerup="context.pointerUp" @pointercancel="context.pointerUp" @lostpointercapture="context.pointerUp" @scroll.passive="context.updateMinimap()">
      <div class="oc-scene" :style="{ width: `${layout.width * viewport.scale}px`, height: `${layout.height * viewport.scale}px`, minWidth: `calc(100% + ${context.dimensions.scrollLeft}px)`, minHeight: `calc(100% + ${context.dimensions.scrollTop}px)` }">
        <div v-if="!disposed" ref="chart" class="orgchart" :class="[options.direction, options.chartClass, { 'oc-relating': context.relating.value, 'oc-instant-compact': context.instantCompact.value }]" :style="{ width: `${layout.width}px`, height: `${layout.height}px`, transform }" role="tree" aria-label="Organization chart">
          <svg class="oc-connections" :width="layout.width" :height="layout.height" aria-hidden="true">
            <rect v-for="[key, group] in layout.compactGroups" :key="key" class="oc-compact-group" :class="{ 'oc-compact-nested': group.depth % 2 }" :data-compact-group="key" :x="group.x" :y="group.y" :width="group.width" :height="group.height" />
            <TransitionGroup name="oc-link" :css="!context.instantCompact.value" tag="g"><path v-for="link in layout.links" :key="link.key" :data-source="link.source" :data-target="link.target" :class="[{ 'oc-spouse-link': link.spouse }, `oc-motion-${context.relationMotions.value.get(link.target) ?? 'children'}`]" :d="link.points.map(([px, py], index) => `${index ? 'L' : 'M'} ${px} ${py}`).join(' ')" /></TransitionGroup>
          </svg>
          <OrganizationChartNode v-for="entry in allNodes" :key="entry.key" :entry="entry" :context="context"><template v-if="$slots.default || $slots.node" #default="scope"><slot :name="$slots.node ? 'node' : 'default'" v-bind="scope" /></template></OrganizationChartNode>
        </div>
      </div>
      <slot v-if="!allNodes.length" name="empty"><div class="oc-empty" role="status">No nodes</div></slot>
    </div>
    <button v-if="options.exportButton && !disposed" type="button" class="oc-export" :disabled="exporting || !allNodes.length" @click="download"><Download :size="16" />{{ options.exportButtonName }}</button>
    <svg v-if="options.minimap && !disposed && allNodes.length" class="oc-minimap" :viewBox="`0 0 ${layout.width} ${layout.height}`" role="img" aria-label="Chart overview" tabindex="0" @wheel="context.wheel($event, true)" @pointerdown="context.minimapDown" @pointermove="context.minimapMove" @pointerup="context.minimapUp" @pointercancel="context.minimapUp" @keydown.left.prevent="viewport.x += 40" @keydown.right.prevent="viewport.x -= 40" @keydown.up.prevent="viewport.y += 40" @keydown.down.prevent="viewport.y -= 40">
      <rect v-for="[key, box] in layout.boxes" :key="key" :x="box.x" :y="box.y" :width="box.width" :height="box.height" class="oc-minimap-node" />
      <rect v-bind="minimapViewport" class="oc-minimap-viewport" />
    </svg>
    <div v-if="exporting" class="oc-export-mask" role="status" aria-label="Exporting"><LoaderCircle class="oc-spinner" :size="28" /></div>
  </div>
</template>