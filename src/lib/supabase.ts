import Taro from '@tarojs/taro'

// 运行时配置：API_BASE 从全局变量读取，方便部署后修改
export function getApiBase(): string {
  return 'https://demo.dev.coze.site'
}

// session token 持久化
export function getSession(): string {
  try {
    return Taro.getStorageSync('session_token') || ''
  } catch {
    return ''
  }
}

export function setSession(token: string): void {
  try {
    Taro.setStorageSync('session_token', token)
  } catch {}
}

export function clearSession(): void {
  try {
    Taro.removeStorageSync('session_token')
  } catch {}
}

// ========== 登录相关（统一走网页版后端代理，避免直连 Supabase） ==========

// 邮箱密码登录
export async function signInWithEmail(email: string, password: string): Promise<{ accessToken: string; user: any }> {
  const res = await Taro.request({
    url: `${getApiBase()}/api/auth/login`,
    method: 'POST',
    data: { email, password },
    header: { 'Content-Type': 'application/json' },
  })
  const data: any = res.data
  if (data.error) {
    throw new Error(data.error)
  }
  if (!data.access_token) {
    throw new Error('登录失败，请检查邮箱和密码')
  }
  setSession(data.access_token)
  return {
    accessToken: data.access_token,
    user: data.user,
  }
}

// 邮箱密码注册
export async function signUpWithEmail(email: string, password: string): Promise<{ user: any; accessToken?: string; error?: string }> {
  const res = await Taro.request({
    url: `${getApiBase()}/api/auth/register`,
    method: 'POST',
    data: { email, password },
    header: { 'Content-Type': 'application/json' },
  })
  const data: any = res.data
  if (data.error) {
    return { user: null, error: data.error }
  }
  if (data.access_token) {
    setSession(data.access_token)
  }
  return {
    user: data.user,
    accessToken: data.access_token,
  }
}

// 获取当前登录用户（由后端验证 token 有效性）
export async function getCurrentUser(): Promise<any | null> {
  const token = getSession()
  if (!token) return null
  try {
    const res = await Taro.request({
      url: `${getApiBase()}/api/auth/me`,
      method: 'GET',
      header: { 'x-session': token },
    })
    const data: any = res.data
    if (data?.user?.id) return data.user
    return null
  } catch {
    return null
  }
}

// 登出
export async function signOut(): Promise<void> {
  clearSession()
}
