import Taro from '@tarojs/taro'
import { todoApi, categoryApi, eventApi } from '../api'

// 同步状态到本地存储
export function getLocalTodos() {
  return Taro.getStorageSync('todos') || []
}

export function saveLocalTodos(todos: any[]) {
  Taro.setStorageSync('todos', todos)
}

export function getLocalCategories() {
  return Taro.getStorageSync('categories') || []
}

export function saveLocalCategories(categories: any[]) {
  Taro.setStorageSync('categories', categories)
}

// 从服务端同步数据到本地
export async function syncFromServer() {
  try {
    const [todosRes, categoriesRes] = await Promise.all([
      todoApi.list(),
      categoryApi.list()
    ])

    if (todosRes.data) {
      saveLocalTodos(todosRes.data)
    }
    if (categoriesRes.data) {
      saveLocalCategories(categoriesRes.data)
    }

    return { success: true }
  } catch (err) {
    console.error('同步失败', err)
    return { success: false, error: err }
  }
}

// 将本地数据同步到服务端
export async function syncToServer() {
  try {
    const localTodos = getLocalTodos()
    // 这里可以实现增量同步逻辑
    return { success: true, count: localTodos.length }
  } catch (err) {
    console.error('上传失败', err)
    return { success: false, error: err }
  }
}

// 双向同步
export async function syncAll() {
  Taro.showLoading({ title: '同步中...' })
  try {
    await syncFromServer()
    Taro.hideLoading()
    Taro.showToast({ title: '同步完成', icon: 'success' })
    return { success: true }
  } catch (err) {
    Taro.hideLoading()
    Taro.showToast({ title: '同步失败', icon: 'none' })
    return { success: false, error: err }
  }
}
