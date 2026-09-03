import Taro from '@tarojs/taro'

// 请求订阅消息权限
export async function requestSubscribe(templateIds: string[]) {
  try {
    const res: any = await Taro.requestSubscribeMessage({
      tmplIds: templateIds
    })
    return res
  } catch (err) {
    console.error('订阅失败', err)
    return null
  }
}

// 本地提醒（简单版：使用系统通知）
export function showReminder(title: string, content: string) {
  Taro.showModal({
    title: title,
    content: content,
    showCancel: false
  })
}

// 检查是否需要提醒
export function checkReminders(todos: any[]) {
  const now = new Date()
  const reminders: any[] = []

  todos.forEach(todo => {
    if (todo.completed) return
    if (!todo.due_date) return

    const dueDate = new Date(todo.due_date)
    const diff = dueDate.getTime() - now.getTime()
    const hoursDiff = diff / (1000 * 60 * 60)

    // 24小时内截止的任务
    if (hoursDiff > 0 && hoursDiff <= 24) {
      reminders.push({
        todo,
        type: 'soon',
        message: `「${todo.title}」将在 ${Math.round(hoursDiff)} 小时后截止`
      })
    }

    // 已过期
    if (hoursDiff < 0) {
      reminders.push({
        todo,
        type: 'overdue',
        message: `「${todo.title}」已过期 ${Math.abs(Math.round(hoursDiff))} 小时`
      })
    }
  })

  return reminders
}

// 格式化时间
export function formatReminderTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `${days}天${hours}小时后`
  } else if (hours > 0) {
    return `${hours}小时后`
  } else {
    return '即将开始'
  }
}
