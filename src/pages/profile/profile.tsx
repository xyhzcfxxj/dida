import { Component } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { signInWithEmail, signUpWithEmail, signOut, getCurrentUser } from '../../lib/supabase'
import { fetchTodos, fetchEvents } from '../../api'
import './profile.scss'

export default class Profile extends Component {
  state = {
    isLoggedIn: false,
    email: '',
    password: '',
    userEmail: '',
    todoCount: 0,
    completedCount: 0,
    loading: false,
    registerMode: false
  }

  componentDidMount() {
    this.checkLogin()
  }

  componentDidShow() {
    this.checkLogin()
    this.loadStats()
  }

  async checkLogin() {
    const user = await getCurrentUser()
    if (user) {
      this.setState({ isLoggedIn: true, userEmail: user.email || '' })
    } else {
      this.setState({ isLoggedIn: false, userEmail: '' })
    }
  }

  async loadStats() {
    try {
      const user = await getCurrentUser()
      if (!user) return
      const todos = await fetchTodos()
      const completed = todos.filter(t => t.status === 'completed').length
      this.setState({
        todoCount: todos.length,
        completedCount: completed
      })
    } catch (err) {
      console.error('加载统计失败', err)
    }
  }

  async handleLogin() {
    const { email, password } = this.state
    if (!email || !password) {
      Taro.showToast({ title: '请输入邮箱和密码', icon: 'none' })
      return
    }
    this.setState({ loading: true })
    try {
      const user = await signInWithEmail(email, password)
      this.setState({ isLoggedIn: true, userEmail: user.email || '' })
      Taro.showToast({ title: '登录成功', icon: 'success' })
      this.loadStats()
    } catch (err: any) {
      Taro.showToast({ title: err.message || '登录失败', icon: 'none' })
    } finally {
      this.setState({ loading: false })
    }
  }

  async handleRegister() {
    const { email, password } = this.state
    if (!email || !password) {
      Taro.showToast({ title: '请输入邮箱和密码', icon: 'none' })
      return
    }
    if (password.length < 6) {
      Taro.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }
    this.setState({ loading: true })
    try {
      const { error } = await signUpWithEmail(email, password)
      if (error) throw error
      Taro.showToast({ title: '注册成功，请查收验证邮件', icon: 'none' })
      this.setState({ registerMode: false })
    } catch (err: any) {
      Taro.showToast({ title: err.message || '注册失败', icon: 'none' })
    } finally {
      this.setState({ loading: false })
    }
  }

  handleLogout() {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          await signOut()
          this.setState({ isLoggedIn: false, userEmail: '', email: '', password: '', todoCount: 0, completedCount: 0 })
          Taro.showToast({ title: '已退出', icon: 'success' })
        }
      }
    })
  }

  render() {
    const { isLoggedIn, userEmail, todoCount, completedCount, loading, registerMode, email, password } = this.state

    return (
      <View className="profile-page">
        <View className="profile-header">
          {isLoggedIn ? (
            <View className="user-info">
              <View className="avatar-placeholder">👤</View>
              <View className="user-detail">
                <Text className="nickname">{userEmail}</Text>
                <Text className="user-id">已登录</Text>
              </View>
            </View>
          ) : (
            <View className="login-form">
              <View className="form-title-wrap">
                <View className="title-icon">✓</View>
                <Text className="form-title">{registerMode ? '创建账号' : '欢迎回来'}</Text>
                <Text className="form-subtitle">
                  {registerMode ? '注册后即可同步网页版数据' : '登录后与网页版数据同步'}
                </Text>
              </View>
              <Input
                className="form-input"
                type="text"
                placeholder="请输入邮箱"
                value={email}
                onInput={(e) => this.setState({ email: e.detail.value })}
              />
              <Input
                className="form-input"
                password
                placeholder="请输入密码"
                value={password}
                onInput={(e) => this.setState({ password: e.detail.value })}
              />
              <Button
                className="login-btn"
                loading={loading}
                onClick={registerMode ? this.handleRegister.bind(this) : this.handleLogin.bind(this)}
              >
                {registerMode ? '注册' : '登录'}
              </Button>
              <Text
                className="switch-link"
                onClick={() => this.setState({ registerMode: !registerMode })}
              >
                {registerMode ? '已有账号？去登录' : '没有账号？去注册'}
              </Text>
            </View>
          )}
        </View>

        {isLoggedIn && (
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
        )}

        <View className="menu-list">
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
