import { Component } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchTodos, fetchEvents } from '../../api'
import { getSession } from '../../lib/supabase'
import './calendar.scss'

interface Todo {
  id: string
  title: string
  priority: string
  status: string
  due_date?: string
}

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
}

export default class Calendar extends Component {
  state = {
    currentMonth: new Date(),
    selectedDate: new Date(),
    todos: [] as Todo[],
    events: [] as CalendarEvent[],
    today: new Date(),
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
    const session = getSession()
    if (session) {
      this.setState({ isLoggedIn: true })
      this.loadData()
    } else {
      this.setState({ isLoggedIn: false })
    }
  }

  async loadData() {
    this.setState({ loading: true })
    try {
      const [todos, events] = await Promise.all([
        fetchTodos(),
        this.loadMonthEvents()
      ])
      this.setState({ todos, events })
    } catch (err) {
      console.error('加载日历数据失败', err)
    } finally {
      this.setState({ loading: false })
    }
  }

  async loadMonthEvents() {
    const { currentMonth } = this.state
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    try {
      return await fetchEvents(start, end)
    } catch {
      return []
    }
  }

  prevMonth() {
    const { currentMonth } = this.state
    this.setState({
      currentMonth: new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    }, () => {
      if (this.state.isLoggedIn) {
        this.loadMonthEvents().then(events => this.setState({ events }))
      }
    })
  }

  nextMonth() {
    const { currentMonth } = this.state
    this.setState({
      currentMonth: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    }, () => {
      if (this.state.isLoggedIn) {
        this.loadMonthEvents().then(events => this.setState({ events }))
      }
    })
  }

  selectDate(day: number, isCurrentMonth: boolean) {
    const { currentMonth } = this.state
    const selected = isCurrentMonth
      ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      : new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, day)
    this.setState({ selectedDate: selected })
  }

  isSameDay(date1: Date, date2: Date) {
    return date1.getFullYear() === date2.getFullYear()
      && date1.getMonth() === date2.getMonth()
      && date1.getDate() === date2.getDate()
  }

  getTodosForDate(date: Date) {
    const { todos } = this.state
    return todos.filter(t => {
      if (!t.due_date) return false
      return this.isSameDay(new Date(t.due_date), date)
    })
  }

  getEventsForDate(date: Date) {
    const { events } = this.state
    return events.filter(e => {
      return this.isSameDay(new Date(e.start_time), date)
    })
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

  getCalendarDays() {
    const { currentMonth } = this.state
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDayOfWeek = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const days: { day: number; isCurrentMonth: boolean; date: Date }[] = []

    // 上月的日期
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      })
    }

    // 当月的日期
    for (let day = 1; day <= totalDays; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day)
      })
    }

    // 下月的日期（补齐到42格，6行）
    const remaining = 42 - days.length
    for (let day = 1; day <= remaining; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day)
      })
    }

    return days
  }

  formatDate(date: Date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`
  }

  render() {
    const { currentMonth, selectedDate, today, loading } = this.state
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    const calendarDays = this.getCalendarDays()
    const dayTodos = this.getTodosForDate(selectedDate)
    const dayEvents = this.getEventsForDate(selectedDate)

    return (
      <View className="calendar-page">
        <View className="page-header">
          <Text className="page-title">日历</Text>
        </View>

        <View className="calendar-header">
          <View className="nav-btn" onClick={() => this.prevMonth()}>
            <Text className="nav-text">‹</Text>
          </View>
          <Text className="month-text">{this.formatDate(currentMonth)}</Text>
          <View className="nav-btn" onClick={() => this.nextMonth()}>
            <Text className="nav-text">›</Text>
          </View>
        </View>

        <View className="week-row">
          {weekDays.map(day => (
            <View key={day} className="week-cell">
              <Text className="week-text">{day}</Text>
            </View>
          ))}
        </View>

        <View className="calendar-grid">
          {calendarDays.map((cell, idx) => {
            const isToday = this.isSameDay(cell.date, today)
            const isSelected = this.isSameDay(cell.date, selectedDate)
            const todosForDay = this.getTodosForDate(cell.date)
            const eventsForDay = this.getEventsForDate(cell.date)
            const totalItems = todosForDay.length + eventsForDay.length

            return (
              <View
                key={idx}
                className={`day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => this.selectDate(cell.day, cell.isCurrentMonth)}
              >
                <Text className={`day-number ${isToday ? 'today' : ''}`}>{cell.day}</Text>
                {totalItems > 0 && (
                  <View className="day-dots">
                    {totalItems > 3 ? (
                      <Text className="more-text">+{totalItems}</Text>
                    ) : (
                      Array.from({ length: Math.min(totalItems, 3) }).map((_, i) => (
                        <View
                          key={i}
                          className="day-dot"
                          style={{
                            backgroundColor: i < eventsForDay.length
                              ? '#0ea5e9'
                              : this.getPriorityColor(todosForDay[i - eventsForDay.length]?.priority || 'medium')
                          }}
                        />
                      ))
                    )}
                  </View>
                )}
              </View>
            )
          })}
        </View>

        <View className="day-detail">
          <Text className="detail-date">
            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
          </Text>
          {loading ? (
            <View className="empty-state">
              <Text className="empty-icon">⏳</Text>
              <Text className="empty-text">加载中...</Text>
            </View>
          ) : dayEvents.length === 0 && dayTodos.length === 0 ? (
            <View className="empty-state">
              <Text className="empty-icon">📅</Text>
              <Text className="empty-text">当日暂无安排</Text>
            </View>
          ) : (
            <ScrollView className="day-items" scrollY>
              {dayEvents.map(event => (
                <View key={event.id} className="day-event">
                  <View className="event-color" />
                  <View className="event-content">
                    <Text className="event-title">{event.title}</Text>
                    <Text className="event-time">
                      {new Date(event.start_time).getHours()}:{String(new Date(event.start_time).getMinutes()).padStart(2, '0')}
                      {' - '}
                      {new Date(event.end_time).getHours()}:{String(new Date(event.end_time).getMinutes()).padStart(2, '0')}
                    </Text>
                  </View>
                </View>
              ))}
              {dayTodos.map(todo => (
                <View key={todo.id} className="day-todo">
                  <View
                    className="todo-dot"
                    style={{ backgroundColor: this.getPriorityColor(todo.priority) }}
                  />
                  <Text className={`todo-text ${todo.status === 'completed' ? 'completed' : ''}`}>
                    {todo.title}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    )
  }
}
