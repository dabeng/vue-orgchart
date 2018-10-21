import orgchartComponent from './OrganizationChart.vue'

const OrganizationChart = {
  install: function (Vue) {
    Vue.component('OrganizationChart', orgchartComponent)
  }
}

export default OrganizationChart