import VueOrganizationChart from './components/index.js';

const components = [
  VueOrganizationChart
]

const install = function(Vue) {
  components.map(component => {
    Vue.component(component.name, component);
  })
}

if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue);
}

export default {
  install,
  VueOrganizationChart
}
