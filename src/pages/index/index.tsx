import { useState, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { fetchTodos } from '../../api'
import { getCurrentUser } from '../../lib/supabase'
import type { Todo } from '../../types'
import './index.scss'

export default function Index() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    today: 0,
  })

  const loadData = useCallback(async () => {
    const user = await getCurrentUser()
    if (!user) {
      setIsLoggedIn(false)
      return
    }
    setIsLoggedIn(true)
    setLoading(true)
    try {
      const data = await fetchTodos()
      setTodos(data)
      const today = new Date().toISOString().split('T')[0]
      const todayTodos = data.filter(t => {
        if (!t.due_date) return false
        return t.due_date.split('T')[0] === today
      })
      setStats({
        total: data.length,
        completed: data.filter(t => t.status === 'completed').length,
        pending: data.filter(t => t.status === 'pending').length,
        today: todayTodos.length,
      })
    } catch (err: any) {
      Taro.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    loadData()
  })

  const goTodo = () => {
    Taro.switchTab({ url: '/pages/todos/todos' })
  }

  const goCalendar = () => {
    Taro.switchTab({ url: '/pages/calendar/calendar' })
  }

  const goCreate = () => {
    Taro.switchTab({ url: '/pages/todos/todos' })
  }

  // 未登录态
  if (!isLoggedIn) {
    return (
      <View className='index-page'>
        <View className='header'>
          <Text className='greeting'>欢迎使用 👋</Text>
          <Text className='subtitle'>登录后与网页版同步所有任务</Text>
        </View>
        <View className='stats-grid'>
          <View className='stat-card stat-blue' style={{ opacity: 0.5 }}>
            <Text className='stat-number'>-</Text>
            <Text className='stat-label'>全部任务</Text>
          </View>
          <View className='stat-card stat-green' style={{ opacity: 0.5 }}>
            <Text className='stat-number'>-</Text>
            <Text className='stat-label'>已完成</Text>
          </View>
          <View className='stat-card stat-orange' style={{ opacity: 0.5 }}>
            <Text className='stat-number'>-</Text>
            <Text className='stat-label'>今日待办</Text>
          </View>
          <View className='stat-card stat-purple' style={{ opacity: 0.5 }}>
            <Text className='stat-number'>-</Text>
            <Text className='stat-label'>新建任务</Text>
          </View>
        </View>
        <View className='login-prompt'>
          <Text className='login-prompt-title'>🔒 请先登录</Text>
          <Text className='login-prompt-desc'>
            {'\n'}使用你的账号登录，与网页版数据同步{'\n'}
            所有待办、日程、分类实时互通{'\n'}
          </Text>
          <View className='login-prompt-btn' onClick={() => Taro.switchTab({ url: '/pages/profile/profile' })}>
            <Text>立即登录</Text>
          </View>
        </View>
      </View>
    )
  }

  const todayTodos = todos.filter(t => {
    if (!t.due_date) return false
    return t.due_date.split('T')[0] === new Date().toISOString().split('T')[0]
  }).slice(0, 5)

  const priorityText = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  }

  const priorityClass = {
    low: 'priority-low',
    medium: 'priority-medium',
    high: 'priority-high',
    urgent: 'priority-urgent',
  }

  return (
    <View className='index-page'>
      <View className='header'>
        <Text className='greeting'>你好 👋</Text>
        <Text className='subtitle'>今天也要加油哦</Text>
      </View>

      <View className='stats-grid'>
        <View className='stat-card stat-blue' onClick={goTodo}>
          <Text className='stat-number'>{stats.total}</Text>
          <Text className='stat-label'>全部任务</Text>
        </View>
        <View className='stat-card stat-green' onClick={goTodo}>
          <Text className='stat-number'>{stats.completed}</Text>
          <Text className='stat-label'>已完成</Text>
        </View>
        <View className='stat-card stat-orange' onClick={goCalendar}>
          <Text className='stat-number'>{stats.today}</Text>
          <Text className='stat-label'>今日待办</Text>
        </View>
        <View className='stat-card stat-purple' onClick={goCreate}>
          <Text className='stat-number'>+</Text>
          <Text className='stat-label'>新建任务</Text>
        </View>
      </View>

      <View className='section'>
        <View className='section-header'>
          <Text className='section-title'>今日任务</Text>
          <Text className='section-more' onClick={goTodo}>查看全部</Text>
        </View>

        <ScrollView scrollY className='todo-list'>
          {loading ? (
            <View className='empty'>
              <Text>加载中...</Text>
            </View>
          ) : todayTodos.length === 0 ? (
            <View className='empty'>
              <Text>今天没有待办任务</Text>
              <Text className='empty-sub' onClick={goCreate}>去创建一个吧</Text>
            </View>
          ) : (
            todayTodos.map(todo => (
              <View key={todo.id} className={`todo-item ${todo.status === 'completed' ? 'completed' : ''}`}>
                <View className='todo-check'>
                  <View className={`check-box ${todo.status === 'completed' ? 'checked' : ''}`}>
                    {todo.status === 'completed' && <Text className='check-icon'>✓</Text>}
                  </View>
                </View>
                <View className='todo-content'>
                  <Text className='todo-title'>{todo.title}</Text>
                  <View className={`priority-tag ${priorityClass[todo.priority]}`}>
                    <Text>{priorityText[todo.priority]}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <View className='quick-actions'>
        <View className='action-btn action-primary' onClick={goCreate}>
          <Text className='action-icon'>✨</Text>
          <Text className='action-text'>AI 智能生成</Text>
        </View>
        <View className='action-btn' onClick={goTodo}>
          <Text className='action-icon'>📋</Text>
          <Text className='action-text'>待办清单</Text>
        </View>
        <View className='action-btn' onClick={goCalendar}>
          <Text className='action-icon'>📅</Text>
          <Text className='action-text'>日历视图</Text>
        </View>
      </View>
    </View>
  )
}
