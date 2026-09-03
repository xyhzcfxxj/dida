import { Component } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

interface Todo {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
}

export default class Index extends Component {
  state = {
    todos: [] as Todo[],
    todayCount: 0,
    completedCount: 0,
    totalCount: 0
  }

  componentDidMount() {
    this.loadTodos()
  }

  componentDidShow() {
    this.loadTodos()
  }

  loadTodos() {
    const todos: Todo[] = Taro.getStorageSync('todos') || []
    const today = new Date().toISOString().split('T')[0]
    const todayCount = todos.filter(t => {
      if (!t.due_date) return false
      return t.due_date.split('T')[0] === today && !t.completed
    }).length
    const completedCount = todos.filter(t => t.completed).length

    this.setState({
      todos: todos.filter(t => !t.completed).slice(0, 5),
      todayCount,
      completedCount,
      totalCount: todos.length
    })
  }

  goToCreate() {
    Taro.switchTab({ url: '/pages/todos/todos' })
  }

  goToCalendar() {
    Taro.switchTab({ url: '/pages/calendar/calendar' })
  }

  getPriorityColor(priority: string) {
    const colors: Record<string, string> = {
      urgent: '#EF4444',
      high: '#F97316',
      medium: '#3B82F6',
      low: '#9CA3AF'
    }
    return colors[priority] || colors.medium
  }

  render() {
    const { todos, todayCount, completedCount, totalCount } = this.state

    return (
      <View className="container">
        <View className="header">
          <Text className="greeting">你好 👋</Text>
          <Text className="subtitle">今天也要高效完成任务哦</Text>
        </View>

        <View className="stats-grid">
          <View className="stat-card">
            <Text className="stat-value">{todayCount}</Text>
            <Text className="stat-label">今日待办</Text>
          </View>
          <View className="stat-card">
            <Text className="stat-value">{totalCount}</Text>
            <Text className="stat-label">全部任务</Text>
          </View>
          <View className="stat-card">
            <Text className="stat-value">{completedCount}</Text>
            <Text className="stat-label">已完成</Text>
          </View>
        </View>

        <View className="quick-actions">
          <Text className="section-title">快捷操作</Text>
          <View className="action-buttons">
            <View className="action-btn primary" onClick={this.goToCreate}>
              <Text className="action-icon">+</Text>
              <Text className="action-text">新建任务</Text>
            </View>
            <View className="action-btn secondary" onClick={this.goToCalendar}>
              <Text className="action-icon">📅</Text>
              <Text className="action-text">查看日历</Text>
            </View>
          </View>
        </View>

        <View className="recent-section">
          <Text className="section-title">最近任务</Text>
          <ScrollView scrollY className="todo-list">
            {todos.length === 0 ? (
              <View className="empty-state">
                <Text className="empty-icon">📝</Text>
                <Text className="empty-text">暂无待办任务</Text>
                <Text className="empty-hint">点击「新建任务」开始吧</Text>
              </View>
            ) : (
              todos.map((todo: Todo) => (
                <View key={todo.id} className="todo-item">
                  <View
                    className="priority-bar"
                    style={{ backgroundColor: this.getPriorityColor(todo.priority) }}
                  />
                  <View className="todo-content">
                    <Text className="todo-title">{todo.title}</Text>
                    {todo.due_date && (
                      <Text className="todo-date">截止：{todo.due_date.split('T')[0]}</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    )
  }
}
