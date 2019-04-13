<template>
  <div id="app">
    <org-chart :datasource="ds" @node-click="selectNode">
<!--       <template slot-scope="{ nodeData }">
        <b @click="selectNode(nodeData)">{{ nodeData.name }}</b>
      </template> -->
    </org-chart>
  </div>
</template>

<script>
import OrgChart from './components/OrganizationChartContainer.vue'

export default {
  name: 'app',
  components: {
    OrgChart
  },
  data () {
    return {
      ds: {
        'id': '1',
        'name': 'Lao Lao',
        'title': 'general manager',
        'children': [
          { 'id': '2', 'name': 'Bo Miao', 'title': 'department manager' },
          { 'id': '3', 'name': 'Su Miao', 'title': 'department manager',
            'children': [
              { 'id': '4', 'name': 'Tie Hua', 'title': 'senior engineer' },
              { 'id': '5', 'name': 'Hei Hei', 'title': 'senior engineer',
                'children': [
                  { 'id': '6', 'name': 'Pang Pang', 'title': 'engineer' },
                  { 'id': '7', 'name': 'Xiang Xiang', 'title': 'UE engineer' }
                ]
               }
             ]
           },
          { 'id': '8', 'name': 'Hong Miao', 'title': 'department manager' },
          { 'id': '9', 'name': 'Chun Miao', 'title': 'department manager' }
        ]
      }
    }
  },
  methods: {
    selectNode (nodeData) {
      alert('node ' + nodeData.name + ' is selected')
    }
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
