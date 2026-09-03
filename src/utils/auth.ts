import Taro from '@tarojs/taro'
import { signInWithEmail as supabaseSignIn, signOut as supabaseSignOut, setSession, getSession, clearSession } from '../lib/supabase'
import type { User } from '../types'

// 从后端获取登录配置（已由网页版提供 auth-config 接口）
// 这里直接封装登录流程

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const { accessToken, user } = await supabaseSignIn(email, password)
  setSession(accessToken)
  const userInfo: User = {
    id: user?.id,
    email: user?.email,
    nickname: user?.user_metadata?.name || user?.email?.split('@')[0] || '用户',
    avatarUrl: user?.user_metadata?.avatar_url || '',
  }
  Taro.setStorageSync('user_info', userInfo)
  return userInfo
}

export async function logout(): Promise<void> {
  await supabaseSignOut()
  clearSession()
  Taro.removeStorageSync('user_info')
}

export function getCurrentUser(): User | null {
  try {
    const token = getSession()
    if (!token) return null
    const user = Taro.getStorageSync('user_info')
    return user || null
  } catch {
    return null
  }
}

export function isLoggedIn(): boolean {
  return !!getSession()
}
