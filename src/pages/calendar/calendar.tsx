import { Component } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './calendar.scss'

interface Todo {
  id: string
  title: string
  completed: boolean
  priority: string
  due_date: string | null
}

export default class CalendarPage extends Component {
  state = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    selectedDate: new Date().toISOString().split('T')[0],
    todos: [] as Todo[]
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

  getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay()
  }

  prevMonth() {
    let { currentYear, currentMonth } = this.state
    currentMonth--
    if (currentMonth < 0) {
      currentMonth = 11
      currentYear--
    }
    this.setState({ currentYear, currentMonth })
  }

  nextMonth() {
    let { currentYear, currentMonth } = this.state
    currentMonth++
    if (currentMonth > 11) {
      currentMonth = 0
      currentYear++
    }
    this.setState({ currentYear, currentMonth })
  }

  selectDate(day: number) {
    const { currentYear, currentMonth } = this.state
    const date = new Date(currentYear, currentMonth, day)
    this.setState({
      selectedDate: date.toISOString().split('T')[0]
    })
  }

  getTodosForDate(dateStr: string) {
    const { todos } = this.state
    return todos.filter(t => {
      if (!t.due_date) return false
      return t.due_date.split('T')[0] === dateStr
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

  isToday(day: number) {
    const today = new Date()
    const { currentYear, currentMonth } = this.state
    return today.getFullYear() === currentYear &&
           today.getMonth() === currentMonth &&
           today.getDate() === day
  }

  isSelected(day: number) {
    const { selectedDate, currentYear, currentMonth } = this.state
    const date = new Date(currentYear, currentMonth, day).toISOString().split('T')[0]
    return selectedDate === date
  }

  render() {
    const { currentYear, currentMonth, selectedDate } = this.state
    const daysInMonth = this.getDaysInMonth(currentYear, currentMonth)
    const firstDay = this.getFirstDayOfMonth(currentYear, currentMonth)
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']

    const days = []
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    const selectedTodos = this.getTodosForDate(selectedDate)
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                        '七月', '八月', '九月', '十月', '十一月', '十二月']

    return (
      <View className="calendar-page">
        <View className="calendar-header">
          <View className="nav-btn" onClick={this.prevMonth.bind(this)}>
            <Text>‹</Text>
          </View>
          <View className="header-title">
            <Text className="year">{currentYear}年</Text>
            <Text className="month">{monthNames[currentMonth]}</Text>
          </View>
          <View className="nav-btn" onClick={this.nextMonth.bind(this)}>
            <Text>›</Text>
          </View>
        </View>

        <View className="weekdays">
          {weekdays.map((day, i) => (
            <View key={i} className={`weekday ${i === 0 || i === 6 ? 'weekend' : ''}`}>
              {day}
            </View>
          ))}
        </View>

        <View className="calendar-grid">
          {days.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} className="day-cell empty" />
            }
            const dateStr = new Date(currentYear, currentMonth, day).toISOString().split('T')[0]
            const dayTodos = this.getTodosForDate(dateStr)
            return (
              <View
                key={day}
                className={`day-cell ${this.isSelected(day) ? 'selected' : ''} ${this.isToday(day) ? 'today' : ''}`}
                onClick={() => this.selectDate(day)}
              >
                <View className="day-number">{day}</View>
                {dayTodos.length > 0 && (
                  <View className="day-dots">
                    {dayTodos.slice(0, 3).map(todo => (
                      <View
                        key={todo.id}
                        className="dot"
                        style={{ backgroundColor: this.getPriorityColor(todo.priority) }}
                      />
                    ))}
                  </View>
                )}
              </View>
            )
          })}
        </View>

        <View className="day-detail">
          <Text className="detail-title">{selectedDate}</Text>
          <ScrollView scrollY className="detail-list">
            {selectedTodos.length === 0 ? (
              <View className="empty-detail">
                <Text className="empty-icon">📅</Text>
                <Text className="empty-text">当日暂无任务</Text>
              </View>
            ) : (
              selectedTodos.map(todo => (
                <View key={todo.id} className="event-card">
                  <View
                    className="event-bar"
                    style={{ backgroundColor: this.getPriorityColor(todo.priority) }}
                  />
                  <View className="event-content">
                    <Text className={`event-title ${todo.completed ? 'completed' : ''}`}>
                      {todo.title}
                    </Text>
                    {!todo.completed && (
                      <Text className="event-status">待完成</Text>
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
