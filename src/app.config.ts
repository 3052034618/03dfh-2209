export default defineAppConfig({
  pages: [
    'pages/tasks/index',
    'pages/inspection/index',
    'pages/exception/index',
    'pages/task-detail/index',
    'pages/inspection-detail/index',
    'pages/exception-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2563EB',
    navigationBarTitleText: '冷藏箱司机端',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#64748B',
    selectedColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/tasks/index',
        text: '今日任务'
      },
      {
        pagePath: 'pages/inspection/index',
        text: '箱体检查'
      },
      {
        pagePath: 'pages/exception/index',
        text: '异常上报'
      }
    ]
  }
})
