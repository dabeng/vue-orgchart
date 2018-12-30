<template>
  <div class="orgchart-container" @wheel="zoomWheelHandler">
    <organization-chart :style="{ transform: transformVal }" :datasource="datasource"></organization-chart>
  </div>
</template>

<script>
import { scale, rotate, translate, transform, toCSS, fromString } from 'transformation-matrix'
import OrganizationChart from './OrganizationChart.vue'

export default {
  name: 'Container',
  props: {
    datasource: {
      type: Object,
      required: true
    },
    zoomoutLimit: {
      type: Number,
      required: false,
      default: 0.5
    },
    zoominLimit: {
      type: Number,
      required: false,
      default: 7
    }
  },
  data () {
    return {
      transformVal: 'matrix(1, 0, 0, 1, 0, 0)'
    }
  },
  components: {
    OrganizationChart
  },
  methods: {
    zoomWheelHandler (event) {
      var newScale  = 1 + (event.deltaY > 0 ? -0.1 : 0.1)
      let targetScale = fromString(this.transformVal).a * newScale
      if (targetScale > this.zoomoutLimit && targetScale < this.zoominLimit) {
        this.transformVal = toCSS(transform(fromString(this.transformVal), scale(newScale, newScale)))
      }
    }
  }
};
</script>

<style scoped>
.orgchart-container {
  position: relative;
  display: inline-block;
  height: 420px;
  width: calc(100% - 24px);
  border: 2px dashed #aaa;
  border-radius: 5px;
  overflow: auto;
  text-align: center;
}
</style>
