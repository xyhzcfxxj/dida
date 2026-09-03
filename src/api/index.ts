import Taro from '@tarojs/taro'

const API_BASE = 'https://demo.dev.coze.site/api'

async function request(url: string, options: any = {}) {
  const session = Taro.getStorageSync('session') || ''
  const res = await Taro.request({
    url: API_BASE + url,
    method: options.method || 'GET',
    data: options.data || {},
    header: {
      'Content-Type': 'application/json',
      ...(session ? { 'x-session': session } : {})
    }
  })
  return res.data
}

// 待办事项 API
export const todoApi = {
  list: () => request('/todos'),
  create: (data: any) => request('/todos', { method: 'POST', data }),
  update: (id: string, data: any) => request(`/todos/${id}`, { method: 'PUT', data }),
  delete: (id: string) => request(`/todos/${id}`, { method: 'DELETE' }),
  generate: (prompt: string) => request('/todos/generate', { method: 'POST', data: { prompt } })
}

// 分类 API
export const categoryApi = {
  list: () => request('/categories'),
  create: (data: any) => request('/categories', { method: 'POST', data }),
  update: (id: string, data: any) => request(`/categories/${id}`, { method: 'PUT', data }),
  delete: (id: string) => request(`/categories/${id}`, { method: 'DELETE' })
}

// 日程 API
export const eventApi = {
  list: (startDate: string, endDate: string) =>
    request(`/events?start_date=${startDate}&end_date=${endDate}`),
  create: (data: any) => request('/events', { method: 'POST', data }),
  update: (id: string, data: any) => request(`/events/${id}`, { method: 'PUT', data }),
  delete: (id: string) => request(`/events/${id}`, { method: 'DELETE' })
}

// 认证 API
export const authApi = {
  login: (code: string) => request('/auth/wx-login', { method: 'POST', data: { code } }),
  config: () => request('/auth-config')
}
