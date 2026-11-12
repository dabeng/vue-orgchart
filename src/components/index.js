import ChartComponent from './ChartContainer.vue'

const OrgChart = Object.assign(ChartComponent, {
  install(app) {
    app.component('OrgChart', ChartComponent)
  },
})

export default OrgChart
export { OrgChart }
export { flatToTree, flatToFamily, ulToTree } from './tree'
