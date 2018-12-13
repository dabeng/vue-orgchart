<template>
  <div id="app">
    <div id="chart-container">
      <vue-organization-chart></vue-organization-chart>
    </div>
  </div>
</template>

<script>

export default {
  name: 'app',
  data: function () {
    return {
      datasource: {
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
#chart-container {
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
