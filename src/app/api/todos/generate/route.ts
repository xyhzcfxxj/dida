import { NextRequest, NextResponse } from 'next/server';

interface GenerateRequest {
  prompt: string;
  category_id?: string;
  priority?: string;
}

interface TodoSuggestion {
  title: string;
  description: string;
  priority: string;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  is_all_day?: boolean;
}

// 扣子自动生成待办事项
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-session');
  
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  try {
    const body: GenerateRequest = await req.json();
    
    if (!body.prompt) {
      return NextResponse.json({ error: '请提供生成提示' }, { status: 400 });
    }
    
    // 获取扣子 API 配置
    const cozeApiToken = process.env.COZE_WORKLOAD_API_TOKEN;
    const cozeApiBase = process.env.COZE_API_BASE_URL || 'https://api.coze.cn';
    
    if (!cozeApiToken) {
      // 如果没有配置 API Token，使用本地智能解析
      const suggestions = parseTodoFromPrompt(body.prompt);
      return NextResponse.json({ suggestions });
    }
    
    // 使用扣子智能体生成待办事项建议
    const botId = process.env.COZE_TODO_BOT_ID;
    
    if (!botId) {
      // 如果没有配置 Bot，则使用本地智能解析
      const suggestions = parseTodoFromPrompt(body.prompt);
      return NextResponse.json({ suggestions });
    }
    
    // 调用扣子 API，让智能体解析时间信息
    const headers: Record<string, string> = {
      Authorization: `Bearer ${cozeApiToken}`,
      'Content-Type': 'application/json',
    };
    
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString().split('T')[0];
    
    const response = await fetch(`${cozeApiBase}/v3/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        bot_id: botId,
        user_id: 'todo_generator',
        stream: false,
        additional_messages: [
          {
            role: 'user',
            content: `当前日期：${currentDateString}。请根据以下提示生成待办事项建议，必须包含时间信息（due_date格式为YYYY-MM-DD，start_time和end_time格式为YYYY-MM-DDTHH:mm:ss）：
            
提示内容：${body.prompt}

请返回JSON数组格式，每个任务包含以下字段：
- title: 任务标题
- description: 任务描述
- priority: 优先级(low/medium/high/urgent)
- due_date: 截止日期(YYYY-MM-DD格式)
- start_time: 开始时间(可选)
- end_time: 结束时间(可选)
- is_all_day: 是否全天任务`,
            content_type: 'text',
          },
        ],
        auto_save_history: false,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Coze API error:', errorText);
      // API 调用失败时，使用本地解析
      const suggestions = parseTodoFromPrompt(body.prompt);
      return NextResponse.json({ suggestions });
    }
    
    const result = await response.json();
    
    // 解析智能体返回的内容
    const content = result.data?.content || '';
    
    // 尝试从内容中提取 JSON 数组
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    let suggestions: TodoSuggestion[] = [];
    
    if (jsonMatch) {
      try {
        suggestions = JSON.parse(jsonMatch[0]);
      } catch {
        suggestions = parseTodoFromPrompt(body.prompt);
      }
    } else {
      suggestions = parseTodoFromPrompt(body.prompt);
    }
    
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Generate todo error:', error);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}

// 智能解析用户输入，提取时间信息
function parseTodoFromPrompt(prompt: string): TodoSuggestion[] {
  const suggestions: TodoSuggestion[] = [];
  const currentDate = new Date();
  const currentDateString = currentDate.toISOString().split('T')[0];
  
  // 提取日期信息
  let extractedDate = currentDateString;
  
  // 日期关键词解析（不使用 break，让日期和时间组合）
  if (/今天|今日/i.test(prompt)) {
    extractedDate = currentDateString;
  } else if (/明天|明日/i.test(prompt)) {
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    extractedDate = tomorrow.toISOString().split('T')[0];
  } else if (/后天/i.test(prompt)) {
    const day = new Date(currentDate);
    day.setDate(day.getDate() + 2);
    extractedDate = day.toISOString().split('T')[0];
  } else if (/下周[一二三四五六日天]/i.test(prompt)) {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const match = prompt.match(/下周([一二三四五六日天])/i);
    if (match) {
      const targetDay = days.indexOf(match[1] === '天' ? '日' : match[1]);
      const result = new Date(currentDate);
      const currentDay = result.getDay();
      const daysUntilTarget = (7 - currentDay + targetDay) % 7 || 7;
      result.setDate(result.getDate() + daysUntilTarget);
      extractedDate = result.toISOString().split('T')[0];
    }
  } else if (/本周[一二三四五六日天]/i.test(prompt)) {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const match = prompt.match(/本周([一二三四五六日天])/i);
    if (match) {
      const targetDay = days.indexOf(match[1] === '天' ? '日' : match[1]);
      const result = new Date(currentDate);
      const currentDay = result.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7;
      result.setDate(result.getDate() + daysUntilTarget);
      extractedDate = result.toISOString().split('T')[0];
    }
  } else if (/(\d{1,2})月(\d{1,2})[日号]/i.test(prompt)) {
    const match = prompt.match(/(\d{1,2})月(\d{1,2})[日号]/i);
    if (match) {
      const month = parseInt(match[1]) - 1;
      const day = parseInt(match[2]);
      const result = new Date(currentDate.getFullYear(), month, day);
      extractedDate = result.toISOString().split('T')[0];
    }
  } else if (/(\d{4})年(\d{1,2})月(\d{1,2})[日号]/i.test(prompt)) {
    const match = prompt.match(/(\d{4})年(\d{1,2})月(\d{1,2})[日号]/i);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const day = parseInt(match[3]);
      const result = new Date(year, month, day);
      extractedDate = result.toISOString().split('T')[0];
    }
  }
  
  // 提取时间段信息
  let startTime: string | undefined;
  let endTime: string | undefined;
  
  // 时间段关键词
  if (/上午|早上|早晨/i.test(prompt)) {
    startTime = `${extractedDate}T09:00:00`;
    endTime = `${extractedDate}T12:00:00`;
  } else if (/下午|午后/i.test(prompt)) {
    startTime = `${extractedDate}T14:00:00`;
    endTime = `${extractedDate}T18:00:00`;
  } else if (/晚上|晚间|傍晚/i.test(prompt)) {
    startTime = `${extractedDate}T18:00:00`;
    endTime = `${extractedDate}T22:00:00`;
  } else if (/中午|午饭/i.test(prompt)) {
    startTime = `${extractedDate}T12:00:00`;
    endTime = `${extractedDate}T14:00:00`;
  }
  
  // 具体时间点解析
  const timeMatch = prompt.match(/(\d{1,2})[点时](\d{1,2})?分?|(\d{1,2}):(\d{1,2})/i);
  if (timeMatch) {
    let hour: number;
    let minute: number;
    
    if (timeMatch[3] && timeMatch[4]) {
      // 格式：HH:mm
      hour = parseInt(timeMatch[3]);
      minute = parseInt(timeMatch[4]);
    } else {
      // 格式：X点Y分 或 X点
      hour = parseInt(timeMatch[1]);
      minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    }
    
    // 处理 12 小时制（下午3点 = 15点）
    if (/下午|晚间|晚上/i.test(prompt) && hour < 12) {
      hour += 12;
    }
    
    startTime = `${extractedDate}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    endTime = `${extractedDate}T${(hour + 1).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
  }
  
  // 清理标题：移除时间关键词，保留核心内容
  let cleanTitle = prompt
    .replace(/今天|今日|明天|明日|后天|下周[一二三四五六日天]|本周[一二三四五六日天]/gi, '')
    .replace(/\d{4}年\d{1,2}月\d{1,2}[日号]|(\d{1,2})月(\d{1,2})[日号]/gi, '')
    .replace(/上午|早上|早晨|下午|午后|晚上|晚间|傍晚|中午|午饭/gi, '')
    .replace(/\d{1,2}[点时](\d{1,2})?分?|(\d{1,2}):(\d{1,2})/gi, '')
    .trim();
  
  // 如果清理后的标题为空，使用原始提示的前30个字符
  if (!cleanTitle) {
    cleanTitle = prompt.substring(0, 30);
  }
  
  // 判断优先级
  let priority: string = 'medium';
  if (/紧急|重要|必须|马上|立即|赶紧/i.test(prompt)) {
    priority = 'urgent';
  } else if (/比较重要|记得|不要忘记/i.test(prompt)) {
    priority = 'high';
  } else if (/有空|方便时|随意/i.test(prompt)) {
    priority = 'low';
  }
  
  // 创建建议，使用清理后的标题
  suggestions.push({
    title: cleanTitle,
    description: `根据您的输入"${prompt}"创建的任务`,
    priority,
    due_date: extractedDate,
    start_time: startTime,
    end_time: endTime,
    is_all_day: !startTime,
  });
  
  return suggestions;
}