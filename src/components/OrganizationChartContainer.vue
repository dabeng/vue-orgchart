<template>
  <div
    class="orgchart-container"
    @wheel="zoom && zoomHandler($event)"
    @mouseup="pan && panning && panEndHandler($event)">
    <organization-chart
      :style="{ transform: transformVal, cursor: cursorVal }"
      :datasource="datasource"
      @mousedown.native="pan && panStartHandler($event)"
      @mousemove.native="pan && panning && panHandler($event)">
    </organization-chart>
  </div>
</template>

<script>
import $ from 'jquery'
import OrganizationChart from './OrganizationChart.vue'

export default {
  name: 'Container',
  props: {
    datasource: {
      type: Object,
      required: true
    },
    pan: {
      type: Boolean,
      required: false,
      default: true
    },
    zoom: {
      type: Boolean,
      required: false,
      default: true
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
      cursorVal: 'default',
      panning: false,
      startX: 0,
      startY: 0,
      transformVal: ''
    }
  },
  components: {
    OrganizationChart
  },
  methods: {
    panEndHandler (e) {
      this.panning = false
      this.cursorVal = 'default'
    },
    panHandler (e) {
        let newX = 0
        let newY = 0
        if (!e.targetTouches) { // pand on desktop
          newX = e.pageX - this.startX
          newY = e.pageY - this.startY
        } else if (e.targetTouches.length === 1) { // pan on mobile device
          newX = e.targetTouches[0].pageX - this.startX
          newY = e.targetTouches[0].pageY - this.startY
        } else if (e.targetTouches.length > 1) {
          return;
        }
        if (this.transformVal === '') {
          if (this.transformVal.indexOf('3d') === -1) {
            this.transformVal = 'matrix(1,0,0,1,' + newX + ',' + newY + ')'
          } else {
            this.transformVal = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,' + newX + ', ' + newY + ',0,1)'
          }
        } else {
          let matrix = this.transformVal.split(',')
          if (this.transformVal.indexOf('3d') === -1) {
            matrix[4] = newX
            matrix[5] = newY + ')'
          } else {
            matrix[12] = newX
            matrix[13] = newY
          }
          this.transformVal = matrix.join(',')
        }
    },
    panStartHandler (e) {
      if ($(e.target).closest('.node').length) {
        this.panning = false
        return
      } else {
        this.cursorVal = 'move'
        this.panning = true
      }
      let lastX = 0
      let lastY = 0
      if (this.transformVal !== '') {
        let matrix = this.transformVal.split(',')
        if (this.transformVal.indexOf('3d') === -1) {
          lastX = parseInt(matrix[4])
          lastY = parseInt(matrix[5])
        } else {
          lastX = parseInt(matrix[12])
          lastY = parseInt(matrix[13])
        }
      }
      if (!e.targetTouches) { // pand on desktop
        this.startX = e.pageX - lastX
        this.startY = e.pageY - lastY
      } else if (e.targetTouches.length === 1) { // pan on mobile device
        this.startX = e.targetTouches[0].pageX - lastX
        this.startY = e.targetTouches[0].pageY - lastY
      } else if (e.targetTouches.length > 1) {
        return
      }
    },
    setChartScale (newScale) {
      let matrix = ''
      let targetScale = 1
      if (this.transformVal === '') {
        this.transformVal = 'matrix(' + newScale + ', 0, 0, ' + newScale + ', 0, 0)'
      } else {
        matrix = this.transformVal.split(',')
        if (this.transformVal.indexOf('3d') === -1) {
          targetScale = Math.abs(window.parseFloat(matrix[3]) * newScale)
          if (targetScale > this.zoomoutLimit && targetScale < this.zoominLimit) {
            matrix[0] = 'matrix(' + targetScale
            matrix[3] = targetScale
            this.transformVal = matrix.join(',')
          }
        } else {
          targetScale = Math.abs(window.parseFloat(matrix[5]) * newScale)
          if (targetScale > this.zoomoutLimit && targetScale < this.zoominLimit) {
            matrix[0] = 'matrix3d(' + targetScale
            matrix[5] = targetScale
            this.transformVal = matrix.join(',')
          }
        }
      }
    },
    zoomHandler (e) {
      let newScale  = 1 + (e.deltaY > 0 ? -0.2 : 0.2)
      this.setChartScale(newScale)
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
