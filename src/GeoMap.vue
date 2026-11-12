<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import { Circle, Fill, Stroke, Style, Text } from 'ol/style.js'
import { fromLonLat } from 'ol/proj.js'
import 'ol/ol.css'
const props = defineProps<{ coordinates?: number[]; city?: string }>()
const element = ref<HTMLElement | null>(null)
let map: Map | undefined
const controller = new AbortController()
onMounted(async () => {
  const response = await fetch('/data/world.geojson', { signal: controller.signal }).catch(() => null)
  if (!response?.ok || controller.signal.aborted || !element.value) return
  const features = new GeoJSON().readFeatures(await response.json(), { featureProjection: 'EPSG:3857' })
  if (controller.signal.aborted) return
  const points = [['Shanghai', [121.47, 31.23]], ['London', [-.12, 51.5]], ['New York', [-74, 40.71]]] as const
  const source = new VectorSource({ features })
  const cities = new VectorSource({ features: points.map(([name, coordinates]) => new Feature({ geometry: new Point(fromLonLat([...coordinates])), name })) })
  map = new Map({
    target: element.value,
    layers: [
      new VectorLayer({ source, style: new Style({ fill: new Fill({ color: '#c9ddd2' }), stroke: new Stroke({ color: '#8aaa98', width: 1 }) }) }),
      new VectorLayer({ source: cities, style: feature => new Style({
        image: new Circle({ radius: 6, fill: new Fill({ color: '#bd5d68' }), stroke: new Stroke({ color: '#ffffff', width: 2 }) }),
        text: new Text({ text: String(feature.get('name')), offsetY: -16, fill: new Fill({ color: '#24372f' }), stroke: new Stroke({ color: '#ffffff', width: 3 }) }),
      }) }),
    ],
    view: new View({ center: fromLonLat(props.coordinates ?? [20, 28]), zoom: 1.2 }),
  })
})
watch(() => props.coordinates, coordinates => { if (coordinates) map?.getView().animate({ center: fromLonLat(coordinates), zoom: 3, duration: 250 }) })
onBeforeUnmount(() => { controller.abort(); map?.setTarget(undefined); map?.dispose() })
</script>
<template><section class="map-section"><header><strong>{{ city || 'Office locations' }}</strong></header><div ref="element" class="office-map" aria-label="Office locations map" /></section></template>