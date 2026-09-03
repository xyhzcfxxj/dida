import Taro from '@tarojs/taro'

// 微信登录
export async function wxLogin() {
  try {
    const loginRes: any = await Taro.login()
    if (loginRes.code) {
      return { success: true, code: loginRes.code }
    }
    return { success: false, error: '获取 code 失败' }
  } catch (err) {
    console.error('微信登录失败', err)
    return { success: false, error: err }
  }
}

// 获取用户信息
export async function getUserProfile() {
  try {
    const res: any = await Taro.getUserProfile({
      desc: '用于完善用户资料'
    })
    return {
      success: true,
      userInfo: {
        nickName: res.userInfo.nickName,
        avatarUrl: res.userInfo.avatarUrl
      }
    }
  } catch (err) {
    return { success: false, error: err }
  }
}

// 保存登录状态
export function saveSession(session: string) {
  Taro.setStorageSync('session', session)
}

// 获取会话
export function getSession() {
  return Taro.getStorageSync('session') || ''
}

// 检查登录状态
export function isLoggedIn() {
  const session = Taro.getStorageSync('session')
  const userInfo = Taro.getStorageSync('userInfo')
  return !!(session || userInfo)
}

// 退出登录
export function logout() {
  Taro.removeStorageSync('session')
  Taro.removeStorageSync('userInfo')
}

// 保存用户信息
export function saveUserInfo(userInfo: any) {
  Taro.setStorageSync('userInfo', userInfo)
}

// 获取用户信息
export function getUserInfo() {
  return Taro.getStorageSync('userInfo') || null
}
