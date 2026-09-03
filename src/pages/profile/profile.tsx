import { Component } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './profile.scss'

interface UserInfo {
  nickName: string
  avatarUrl: string
}

export default class Profile extends Component {
  state = {
    isLoggedIn: false,
    userInfo: null as UserInfo | null,
    todoCount: 0,
    completedCount: 0
  }

  componentDidMount() {
    this.loadUserInfo()
    this.loadStats()
  }

  componentDidShow() {
    this.loadStats()
  }

  loadUserInfo() {
    const userInfo: UserInfo = Taro.getStorageSync('userInfo') || null
    if (userInfo) {
      this.setState({ isLoggedIn: true, userInfo })
    }
  }

  loadStats() {
    const todos: any[] = Taro.getStorageSync('todos') || []
    const completedCount = todos.filter(t => t.completed).length
    this.setState({
      todoCount: todos.length,
      completedCount
    })
  }

  async handleLogin() {
    try {
      const res = await Taro.getUserProfile({
        desc: '用于完善用户资料'
      })
      const userInfo: UserInfo = {
        nickName: res.userInfo.nickName,
        avatarUrl: res.userInfo.avatarUrl
      }
      Taro.setStorageSync('userInfo', userInfo)
      this.setState({ isLoggedIn: true, userInfo })
      Taro.showToast({ title: '登录成功', icon: 'success' })
    } catch (err) {
      Taro.showToast({ title: '登录失败', icon: 'none' })
    }
  }

  handleLogout() {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('userInfo')
          this.setState({ isLoggedIn: false, userInfo: null })
          Taro.showToast({ title: '已退出', icon: 'success' })
        }
      }
    })
  }

  syncData() {
    Taro.showToast({ title: '同步中...', icon: 'loading' })
    setTimeout(() => {
      Taro.showToast({ title: '同步完成', icon: 'success' })
    }, 1500)
  }

  render() {
    const { isLoggedIn, userInfo, todoCount, completedCount } = this.state

    return (
      <View className="profile-page">
        <View className="profile-header">
          {isLoggedIn && userInfo ? (
            <View className="user-info">
              <Image className="avatar" src={userInfo.avatarUrl} />
              <View className="user-detail">
                <Text className="nickname">{userInfo.nickName}</Text>
                <Text className="user-id">微信用户</Text>
              </View>
            </View>
          ) : (
            <View className="login-prompt" onClick={this.handleLogin.bind(this)}>
              <View className="avatar-placeholder">👤</View>
              <View className="user-detail">
                <Text className="nickname">点击登录</Text>
                <Text className="user-id">登录后可同步数据</Text>
              </View>
            </View>
          )}
        </View>

        <View className="stats-section">
          <View className="stat-item">
            <Text className="stat-num">{todoCount}</Text>
            <Text className="stat-label">任务总数</Text>
          </View>
          <View className="stat-divider" />
          <View className="stat-item">
            <Text className="stat-num">{completedCount}</Text>
            <Text className="stat-label">已完成</Text>
          </View>
          <View className="stat-divider" />
          <View className="stat-item">
            <Text className="stat-num">{todoCount > 0 ? Math.round(completedCount / todoCount * 100) : 0}%</Text>
            <Text className="stat-label">完成率</Text>
          </View>
        </View>

        <View className="menu-list">
          <View className="menu-item" onClick={this.syncData.bind(this)}>
            <Text className="menu-icon">🔄</Text>
            <Text className="menu-title">数据同步</Text>
            <Text className="menu-arrow">›</Text>
          </View>

          <View className="menu-item">
            <Text className="menu-icon">🔔</Text>
            <Text className="menu-title">消息提醒</Text>
            <Text className="menu-arrow">›</Text>
          </View>

          <View className="menu-item">
            <Text className="menu-icon">🎨</Text>
            <Text className="menu-title">主题设置</Text>
            <Text className="menu-arrow">›</Text>
          </View>

          <View className="menu-item">
            <Text className="menu-icon">❓</Text>
            <Text className="menu-title">帮助与反馈</Text>
            <Text className="menu-arrow">›</Text>
          </View>

          <View className="menu-item">
            <Text className="menu-icon">ℹ️</Text>
            <Text className="menu-title">关于我们</Text>
            <Text className="menu-arrow">›</Text>
          </View>
        </View>

        {isLoggedIn && (
          <Button className="logout-btn" onClick={this.handleLogout.bind(this)}>
            退出登录
          </Button>
        )}
      </View>
    )
  }
}
