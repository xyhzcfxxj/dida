import { Component } from 'react'
import { View, Text, Input, Button, Checkbox, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './todos.scss'

interface Todo {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  notes: string
  created_at: string
  category_id: string | null
}

const priorities = [
  { value: 'low', label: '低', color: '#9CA3AF' },
  { value: 'medium', label: '中', color: '#3B82F6' },
  { value: 'high', label: '高', color: '#F97316' },
  { value: 'urgent', label: '紧急', color: '#EF4444' }
]

export default class Todos extends Component {
  state = {
    todos: [] as Todo[],
    filter: 'all' as 'all' | 'today' | 'completed' | 'active',
    showAdd: false,
    newTitle: '',
    newPriority: 'medium',
    newDueDate: ''
  }

  componentDidMount() {
    this.loadTodos()
  }

  componentDidShow() {
    this.loadTodos()
  }

  loadTodos() {
    const todos: Todo[] = Taro.getStorageSync('todos') || []
    this.setState({ todos })
  }

  saveTodos(todos: Todo[]) {
    Taro.setStorageSync('todos', todos)
    this.setState({ todos })
  }

  getFilteredTodos() {
    const { todos, filter } = this.state
    const today = new Date().toISOString().split('T')[0]

    switch (filter) {
      case 'today':
        return todos.filter(t => {
          if (!t.due_date) return false
          return t.due_date.split('T')[0] === today && !t.completed
        })
      case 'completed':
        return todos.filter(t => t.completed)
      case 'active':
        return todos.filter(t => !t.completed)
      default:
        return todos.filter(t => !t.completed)
    }
  }

  showAddDialog() {
    this.setState({ showAdd: true, newTitle: '', newPriority: 'medium', newDueDate: '' })
  }

  hideAddDialog() {
    this.setState({ showAdd: false })
  }

  handleTitleInput(e: any) {
    this.setState({ newTitle: e.detail.value })
  }

  handleDateChange(e: any) {
    this.setState({ newDueDate: e.detail.value })
  }

  selectPriority(priority: string) {
    this.setState({ newPriority: priority })
  }

  addTodo() {
    const { newTitle, newPriority, newDueDate, todos } = this.state
    if (!newTitle.trim()) {
      Taro.showToast({ title: '请输入任务标题', icon: 'none' })
      return
    }

    const newTodo: Todo = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      completed: false,
      priority: newPriority as any,
      due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
      notes: '',
      created_at: new Date().toISOString(),
      category_id: null
    }

    const updated = [newTodo, ...todos]
    this.saveTodos(updated)
    this.hideAddDialog()
    Taro.showToast({ title: '创建成功', icon: 'success' })
  }

  toggleTodo(id: string) {
    const { todos } = this.state
    const updated = todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    )
    this.saveTodos(updated)
  }

  deleteTodo(id: string) {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      success: (res) => {
        if (res.confirm) {
          const { todos } = this.state
          const updated = todos.filter(t => t.id !== id)
          this.saveTodos(updated)
          Taro.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
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

  getPriorityBg(priority: string) {
    const colors: Record<string, string> = {
      urgent: '#FEF2F2',
      high: '#FFF7ED',
      medium: '#EFF6FF',
      low: '#F3F4F6'
    }
    return colors[priority] || colors.medium
  }

  render() {
    const { filter, showAdd, newTitle, newPriority, newDueDate } = this.state
    const filteredTodos = this.getFilteredTodos()

    const filters = [
      { value: 'all', label: '全部' },
      { value: 'today', label: '今天' },
      { value: 'active', label: '进行中' },
      { value: 'completed', label: '已完成' }
    ]

    return (
      <View className="todos-page">
        <View className="page-header">
          <Text className="page-title">待办清单</Text>
          <View className="add-btn" onClick={this.showAddDialog.bind(this)}>
            <Text className="add-icon">+</Text>
          </View>
        </View>

        <ScrollView scrollX className="filter-tabs">
          {filters.map(f => (
            <View
              key={f.value}
              className={`filter-tab ${filter === f.value ? 'active' : ''}`}
              onClick={() => this.setState({ filter: f.value as any })}
            >
              <Text>{f.label}</Text>
            </View>
          ))}
        </ScrollView>

        <ScrollView scrollY className="todo-list">
          {filteredTodos.length === 0 ? (
            <View className="empty-state">
              <Text className="empty-icon">📋</Text>
              <Text className="empty-text">暂无任务</Text>
            </View>
          ) : (
            filteredTodos.map(todo => (
              <View key={todo.id} className="todo-card" onLongPress={() => this.deleteTodo(todo.id)}>
                <Checkbox
                  checked={todo.completed}
                  onChange={() => this.toggleTodo(todo.id)}
                  color={this.getPriorityColor(todo.priority)}
                />
                <View className="todo-info">
                  <Text className={`todo-title ${todo.completed ? 'completed' : ''}`}>
                    {todo.title}
                  </Text>
                  {todo.due_date && (
                    <Text className="todo-due">
                      📅 {todo.due_date.split('T')[0]}
                    </Text>
                  )}
                </View>
                <View
                  className="priority-tag"
                  style={{
                    backgroundColor: this.getPriorityBg(todo.priority),
                    color: this.getPriorityColor(todo.priority)
                  }}
                >
                  {priorities.find(p => p.value === todo.priority)?.label}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {showAdd && (
          <View className="modal-mask" onClick={this.hideAddDialog.bind(this)}>
            <View className="modal-content" onClick={e => e.stopPropagation()}>
              <Text className="modal-title">新建任务</Text>
              <View className="add-form">
                <View className="form-item">
                  <Text className="form-label">任务标题</Text>
                  <Input
                    placeholder="请输入任务标题"
                    value={newTitle}
                    onInput={this.handleTitleInput.bind(this)}
                    className="form-input"
                  />
                </View>

                <View className="form-item">
                  <Text className="form-label">优先级</Text>
                  <View className="priority-options">
                    {priorities.map(p => (
                      <View
                        key={p.value}
                        className={`priority-option ${newPriority === p.value ? 'selected' : ''}`}
                        style={{
                          borderColor: newPriority === p.value ? p.color : '#e5e7eb',
                          backgroundColor: newPriority === p.value ? this.getPriorityBg(p.value) : 'white',
                          color: p.color
                        }}
                        onClick={() => this.selectPriority(p.value)}
                      >
                        {p.label}
                      </View>
                    ))}
                  </View>
                </View>

                <View className="form-item">
                  <Text className="form-label">截止日期</Text>
                  <Input
                    type="text"
                    placeholder="选择截止日期"
                    value={newDueDate}
                    onFocus={() => {
                      Taro.showActionSheet({
                        itemList: ['今天', '明天', '后天', '不设置'],
                        success: (res) => {
                          const dates = []
                          const today = new Date()
                          for (let i = 0; i < 3; i++) {
                            const d = new Date(today)
                            d.setDate(today.getDate() + i)
                            dates.push(d.toISOString().split('T')[0])
                          }
                          if (res.tapIndex < 3) {
                            this.setState({ newDueDate: dates[res.tapIndex] })
                          } else {
                            this.setState({ newDueDate: '' })
                          }
                        }
                      })
                    }}
                    className="form-input"
                  />
                </View>
              </View>
              <View className="modal-actions">
                <Button className="modal-btn cancel" onClick={this.hideAddDialog.bind(this)}>取消</Button>
                <Button className="modal-btn confirm" onClick={this.addTodo.bind(this)}>确定</Button>
              </View>
            </View>
          </View>
        )}
      </View>
    )
  }
}
