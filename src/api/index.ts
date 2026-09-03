import Taro from '@tarojs/taro'
import { getApiBase, getSession } from '../lib/supabase'

const API_BASE = getApiBase()

function request<T = any>(path: string, options: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  needAuth?: boolean
}): Promise<T> {
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options.needAuth !== false) {
    const token = getSession()
    if (token) {
      header['x-session'] = token
    }
  }
  return new Promise((resolve, reject) => {
    Taro.request({
      url: `${API_BASE}${path}`,
      method: options.method,
      data: options.data,
      header,
      success: (res: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          const msg = res.data?.error || res.data?.message || `请求失败 (${res.statusCode})`
          reject(new Error(msg))
        }
      },
      fail: (err: any) => {
        reject(new Error(err.errMsg || '网络错误'))
      },
    })
  })
}

// ========== 待办事项 ==========

export interface Todo {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'completed'
  due_date?: string
  start_time?: string
  end_time?: string
  category_id?: string
  sync_to_calendar?: boolean
  created_at?: string
  updated_at?: string
}

export async function fetchTodos(): Promise<Todo[]> {
  const res = await request<{ data?: Todo[]; todos?: Todo[] }>('/api/todos', { method: 'GET' })
  return res.data || res.todos || []
}

export async function createTodo(payload: Partial<Todo>): Promise<Todo> {
  const res = await request<{ data?: Todo; todo?: Todo }>('/api/todos', {
    method: 'POST',
    data: payload,
  })
  return res.data || res.todo || (res as any)
}

export async function updateTodo(id: string, payload: Partial<Todo>): Promise<Todo> {
  const res = await request<{ data?: Todo; todo?: Todo }>(`/api/todos/${id}`, {
    method: 'PUT',
    data: payload,
  })
  return res.data || res.todo || (res as any)
}

export async function deleteTodo(id: string): Promise<void> {
  await request(`/api/todos/${id}`, { method: 'DELETE' })
}

// AI 生成待办
export async function generateTodo(prompt: string): Promise<Todo> {
  const res = await request<{ data?: Todo; todo?: Todo }>('/api/todos/generate', {
    method: 'POST',
    data: { prompt },
  })
  return res.data || res.todo || (res as any)
}

// ========== 分类 ==========

export interface Category {
  id: string
  name: string
  color: string
  icon?: string
  created_at?: string
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await request<{ data?: Category[]; categories?: Category[] }>('/api/categories', { method: 'GET' })
  return res.data || res.categories || []
}

export async function createCategory(payload: Partial<Category>): Promise<Category> {
  const res = await request<{ data?: Category; category?: Category }>('/api/categories', {
    method: 'POST',
    data: payload,
  })
  return res.data || res.category || (res as any)
}

// ========== 日程事件 ==========

export interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  description?: string
  todo_id?: string
  category_id?: string
  created_at?: string
}

export async function fetchEvents(params: { start_date: string; end_date: string }): Promise<CalendarEvent[]> {
  const query = new URLSearchParams(params as any).toString()
  const res = await request<{ data?: CalendarEvent[]; events?: CalendarEvent[] }>(`/api/events?${query}`, { method: 'GET' })
  return res.data || res.events || []
}

export async function createEvent(payload: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const res = await request<{ data?: CalendarEvent; event?: CalendarEvent }>('/api/events', {
    method: 'POST',
    data: payload,
  })
  return res.data || res.event || (res as any)
}

export async function deleteEvent(id: string): Promise<void> {
  await request(`/api/events/${id}`, { method: 'DELETE' })
}
