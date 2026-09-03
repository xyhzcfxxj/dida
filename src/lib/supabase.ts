import Taro from '@tarojs/taro'

// 从网页版后端获取登录配置（Supabase URL & anon key）
// 避免在小程序里硬编码敏感信息

let configCache: { url: string; key: string } | null = null

export async function getAuthConfig(): Promise<{ url: string; key: string }> {
  if (configCache) return configCache
  const res = await Taro.request({
    url: `${getApiBase()}/api/auth-config`,
    method: 'GET',
  })
  const data: any = res.data
  configCache = {
    url: data.supabase_url,
    key: data.supabase_anon_key,
  }
  return configCache!
}

// 用 Supabase Auth 邮箱密码登录，返回 access_token
export async function signInWithEmail(email: string, password: string): Promise<{ accessToken: string; user: any }> {
  const { url, key } = await getAuthConfig()
  const res = await Taro.request({
    url: `${url}/auth/v1/token?grant_type=password`,
    method: 'POST',
    data: { email, password },
    header: {
      apikey: key,
      'Content-Type': 'application/json',
    },
  })
  const data: any = res.data
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || '登录失败')
  }
  return {
    accessToken: data.access_token,
    user: data.user,
  }
}

// 注册新用户（邮箱密码）
export async function signUpWithEmail(email: string, password: string): Promise<{ user: any; error?: string }> {
  const { url, key } = await getAuthConfig()
  const res = await Taro.request({
    url: `${url}/auth/v1/signup`,
    method: 'POST',
    data: { email, password },
    header: {
      apikey: key,
      'Content-Type': 'application/json',
    },
  })
  const data: any = res.data
  if (data?.message) {
    return { user: null, error: data.message }
  }
  if (!data?.id && !data?.user?.id && data?.error_description) {
    return { user: null, error: data.error_description }
  }
  return { user: data.user || data }
}

// 获取当前登录用户（通过 Supabase 接口验证 token）
export async function getCurrentUser(): Promise<any | null> {
  const token = getSession()
  if (!token) return null
  const { url, key } = await getAuthConfig()
  try {
    const res = await Taro.request({
      url: `${url}/auth/v1/user`,
      method: 'GET',
      header: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    const data: any = res.data
    if (data?.id) return data
    return null
  } catch {
    return null
  }
}

export async function signOut(): Promise<void> {
  const token = getSession()
  if (!token) return
  const { url, key } = await getAuthConfig()
  try {
    await Taro.request({
      url: `${url}/auth/v1/logout`,
      method: 'POST',
      header: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
  } catch (e) {
    // 忽略登出错误
  }
}

// 运行时配置：API_BASE 从全局变量读取，方便部署后修改
export function getApiBase(): string {
  return 'https://demo.dev.coze.site'
}

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
