import { Component } from 'react'
import { View, Text, Input, ScrollView, Checkbox } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchTodos, createTodo, updateTodo, deleteTodo } from '../../api'
import { getSession, signInWithEmail, signOut, clearSession } from '../../lib/supabase'
import './todos.scss'

interface Todo {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed'
  due_date?: string
}

export default class Todos extends Component {
  state = {
    todos: [] as Todo[],
    newTodo: '',
    filter: 'all' as 'all' | 'pending' | 'completed',
    isLoggedIn: false,
    loading: false
  }

  componentDidMount() {
    this.checkLoginAndLoad()
  }

  componentDidShow() {
    this.checkLoginAndLoad()
  }

  async checkLoginAndLoad() {
    const session = await getSession()
    if (session) {
      this.setState({ isLoggedIn: true })
      this.loadTodos()
    } else {
      this.setState({ isLoggedIn: false, todos: [] })
    }
  }

  async loadTodos() {
    this.setState({ loading: true })
    try {
      const data = await fetchTodos()
      this.setState({ todos: data })
    } catch (err: any) {
      console.error('加载待办失败', err)
      Taro.showToast({ title: err.message || '加载失败', icon: 'none' })
      const localTodos = Taro.getStorageSync('todos') || []
      this.setState({ todos: localTodos })
    } finally {
      this.setState({ loading: false })
    }
  }

  async handleAdd() {
    const { newTodo, isLoggedIn, todos } = this.state
    if (!newTodo.trim()) return

    if (!isLoggedIn) {
      const newItem: Todo = {
        id: Date.now().toString(),
        title: newTodo.trim(),
        priority: 'medium',
        status: 'pending'
      }
      const updated = [newItem, ...todos]
      this.setState({ todos: updated, newTodo: '' })
      Taro.setStorageSync('todos', updated)
      return
    }

    try {
      const created = await createTodo({ title: newTodo.trim(), priority: 'medium', status: 'pending' })
      this.setState((prev: any) => ({
        todos: [created, ...prev.todos],
        newTodo: ''
      }))
      Taro.showToast({ title: '已添加', icon: 'success' })
    } catch (err: any) {
      Taro.showToast({ title: err.message || '添加失败', icon: 'none' })
    }
  }

  async handleToggle(id: string, currentStatus: string) {
    const { isLoggedIn, todos } = this.state
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'

    // 立即更新 UI
    const updated = todos.map(t => t.id === id ? { ...t, status: newStatus as any } : t)
    this.setState({ todos: updated })
    if (!isLoggedIn) {
      Taro.setStorageSync('todos', updated)
      return
    }

    try {
      await updateTodo(id, { status: newStatus })
    } catch (err) {
      // 失败回滚
      this.setState({ todos })
      Taro.showToast({ title: '更新失败', icon: 'none' })
    }
  }

  handleDelete(id: string) {
    Taro.showModal({
      title: '删除任务',
      content: '确定要删除这个任务吗？',
      success: async (res) => {
        if (!res.confirm) return
        const { isLoggedIn, todos } = this.state
        const updated = todos.filter(t => t.id !== id)
        this.setState({ todos: updated })

        if (!isLoggedIn) {
          Taro.setStorageSync('todos', updated)
          return
        }

        try {
          await deleteTodo(id)
          Taro.showToast({ title: '已删除', icon: 'success' })
        } catch (err) {
          this.setState({ todos })
          Taro.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  }

  setFilter(filter: 'all' | 'pending' | 'completed') {
    this.setState({ filter })
  }

  getPriorityColor(priority: string) {
    const colors: Record<string, string> = {
      urgent: '#ef4444',
      high: '#f97316',
      medium: '#3b82f6',
      low: '#9ca3af'
    }
    return colors[priority] || '#9ca3af'
  }

  getPriorityLabel(priority: string) {
    const labels: Record<string, string> = {
      urgent: '紧急',
      high: '高',
      medium: '中',
      low: '低'
    }
    return labels[priority] || '中'
  }

  render() {
    const { todos, newTodo, filter, loading } = this.state
    const filteredTodos = filter === 'all'
      ? todos
      : filter === 'pending'
        ? todos.filter(t => t.status !== 'completed')
        : todos.filter(t => t.status === 'completed')

    return (
      <View className="todos-page">
        <View className="page-header">
          <Text className="page-title">待办清单</Text>
          <Text className="page-subtitle">共 {todos.length} 个任务</Text>
        </View>

        <View className="add-section">
          <Input
            className="add-input"
            type="text"
            placeholder="添加新任务..."
            value={newTodo}
            onInput={(e) => this.setState({ newTodo: e.detail.value })}
            onConfirm={() => this.handleAdd()}
          />
          <View className="add-btn" onClick={() => this.handleAdd()}>
            <Text className="add-btn-text">+</Text>
          </View>
        </View>

        <View className="filter-tabs">
          {[
            { key: 'all', label: '全部' },
            { key: 'pending', label: '进行中' },
            { key: 'completed', label: '已完成' }
          ].map(item => (
            <View
              key={item.key}
              className={`filter-tab ${filter === item.key ? 'active' : ''}`}
              onClick={() => this.setFilter(item.key as any)}
            >
              <Text className="filter-tab-text">{item.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView className="todo-list" scrollY>
          {loading ? (
            <View className="empty-state">
              <Text className="empty-icon">⏳</Text>
              <Text className="empty-text">加载中...</Text>
            </View>
          ) : filteredTodos.length === 0 ? (
            <View className="empty-state">
              <Text className="empty-icon">📝</Text>
              <Text className="empty-text">暂无任务</Text>
              <Text className="empty-hint">点击上方添加新任务</Text>
            </View>
          ) : (
            filteredTodos.map(todo => (
              <View key={todo.id} className="todo-item">
                <Checkbox
                  className="todo-checkbox"
                  checked={todo.status === 'completed'}
                  onChange={() => this.handleToggle(todo.id, todo.status)}
                />
                <View
                  className="priority-bar"
                  style={{ backgroundColor: this.getPriorityColor(todo.priority) }}
                />
                <View className="todo-content" onClick={() => this.handleDelete(todo.id)}>
                  <Text className={`todo-title ${todo.status === 'completed' ? 'completed' : ''}`}>
                    {todo.title}
                  </Text>
                  <View className="todo-meta">
                    <Text
                      className="priority-tag"
                      style={{
                        backgroundColor: this.getPriorityColor(todo.priority) + '20',
                        color: this.getPriorityColor(todo.priority)
                      }}
                    >
                      {this.getPriorityLabel(todo.priority)}
                    </Text>
                    {todo.due_date && (
                      <Text className="due-date">📅 {todo.due_date?.slice(0, 10)}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    )
  }
}
