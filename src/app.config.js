export default {
  pages: [
    'pages/index/index',
    'pages/todos/todos',
    'pages/calendar/calendar',
    'pages/profile/profile'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#3B82F6',
    navigationBarTitleText: '待办清单',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#9CA3AF',
    selectedColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      { pagePath: 'pages/index/index', text: '首页', iconPath: 'assets/icons/home.png', selectedIconPath: 'assets/icons/home-active.png' },
      { pagePath: 'pages/todos/todos', text: '待办', iconPath: 'assets/icons/list.png', selectedIconPath: 'assets/icons/list-active.png' },
      { pagePath: 'pages/calendar/calendar', text: '日历', iconPath: 'assets/icons/calendar.png', selectedIconPath: 'assets/icons/calendar-active.png' },
      { pagePath: 'pages/profile/profile', text: '我的', iconPath: 'assets/icons/user.png', selectedIconPath: 'assets/icons/user-active.png' }
    ]
  }
}
