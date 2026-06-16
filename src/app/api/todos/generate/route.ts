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
  
  // 时间关键词映射
  const timePatterns: { pattern: RegExp; getDate: () => { date: string; startTime?: string; endTime?: string } }[] = [
    {
      pattern: /今天|今日/i,
      getDate: () => ({ date: currentDateString })
    },
    {
      pattern: /明天|明日/i,
      getDate: () => {
        const tomorrow = new Date(currentDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { date: tomorrow.toISOString().split('T')[0] };
      }
    },
    {
      pattern: /后天/i,
      getDate: () => {
        const day = new Date(currentDate);
        day.setDate(day.getDate() + 2);
        return { date: day.toISOString().split('T')[0] };
      }
    },
    {
      pattern: /下周[一二三四五六日天]/i,
      getDate: () => {
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        const match = prompt.match(/下周([一二三四五六日天])/i);
        if (match) {
          const targetDay = days.indexOf(match[1] === '天' ? '日' : match[1]);
          const result = new Date(currentDate);
          const currentDay = result.getDay();
          const daysUntilTarget = (7 - currentDay + targetDay) % 7 || 7;
          result.setDate(result.getDate() + daysUntilTarget);
          return { date: result.toISOString().split('T')[0] };
        }
        return { date: currentDateString };
      }
    },
    {
      pattern: /本周[一二三四五六日天]/i,
      getDate: () => {
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        const match = prompt.match(/本周([一二三四五六日天])/i);
        if (match) {
          const targetDay = days.indexOf(match[1] === '天' ? '日' : match[1]);
          const result = new Date(currentDate);
          const currentDay = result.getDay();
          const daysUntilTarget = (targetDay - currentDay + 7) % 7;
          result.setDate(result.getDate() + daysUntilTarget);
          return { date: result.toISOString().split('T')[0] };
        }
        return { date: currentDateString };
      }
    },
    {
      pattern: /(\d{1,2})月(\d{1,2})[日号]/i,
      getDate: () => {
        const match = prompt.match(/(\d{1,2})月(\d{1,2})[日号]/i);
        if (match) {
          const month = parseInt(match[1]) - 1;
          const day = parseInt(match[2]);
          const result = new Date(currentDate.getFullYear(), month, day);
          return { date: result.toISOString().split('T')[0] };
        }
        return { date: currentDateString };
      }
    },
    {
      pattern: /(\d{4})年(\d{1,2})月(\d{1,2})[日号]/i,
      getDate: () => {
        const match = prompt.match(/(\d{4})年(\d{1,2})月(\d{1,2})[日号]/i);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]) - 1;
          const day = parseInt(match[3]);
          const result = new Date(year, month, day);
          return { date: result.toISOString().split('T')[0] };
        }
        return { date: currentDateString };
      }
    },
    {
      pattern: /(\d{1,2})[点时](:\d{1,2})?/i,
      getDate: () => {
        const match = prompt.match(/(\d{1,2})[点时](:\d{1,2})?/i);
        if (match) {
          const hour = parseInt(match[1]);
          const minute = match[2] ? parseInt(match[2].substring(1)) : 0;
          const startTime = `${currentDateString}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
          const endTime = `${currentDateString}T${(hour + 1).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
          return { date: currentDateString, startTime, endTime };
        }
        return { date: currentDateString };
      }
    },
    {
      pattern: /上午|早上|早晨/i,
      getDate: () => ({ date: currentDateString, startTime: `${currentDateString}T09:00:00`, endTime: `${currentDateString}T12:00:00` })
    },
    {
      pattern: /下午|午后/i,
      getDate: () => ({ date: currentDateString, startTime: `${currentDateString}T14:00:00`, endTime: `${currentDateString}T18:00:00` })
    },
    {
      pattern: /晚上|晚间|傍晚/i,
      getDate: () => ({ date: currentDateString, startTime: `${currentDateString}T18:00:00`, endTime: `${currentDateString}T22:00:00` })
    },
  ];
  
  // 提取时间信息
  let extractedTime: { date: string; startTime?: string; endTime?: string } = { date: currentDateString };
  
  for (const { pattern, getDate } of timePatterns) {
    if (pattern.test(prompt)) {
      extractedTime = getDate();
      break;
    }
  }
  
  // 根据关键词生成建议
  const keywords = prompt.toLowerCase();
  
  if (keywords.includes('工作') || keywords.includes('项目') || keywords.includes('会议') || keywords.includes('开会')) {
    suggestions.push({
      title: keywords.includes('会议') ? '参加会议' : '整理工作计划',
      description: keywords.includes('会议') ? '准时参加会议，做好会议记录' : '列出本周需要完成的工作任务',
      priority: 'high',
      due_date: extractedTime.date,
      start_time: extractedTime.startTime,
      end_time: extractedTime.endTime,
    });
  }
  
  if (keywords.includes('学习') || keywords.includes('读书') || keywords.includes('复习') || keywords.includes('考试')) {
    suggestions.push({
      title: keywords.includes('考试') ? '准备考试' : '阅读学习资料',
      description: keywords.includes('考试') ? '复习考试内容，做好考前准备' : '安排学习时间，完成阅读任务',
      priority: keywords.includes('考试') ? 'urgent' : 'medium',
      due_date: extractedTime.date,
      start_time: extractedTime.startTime,
      end_time: extractedTime.endTime,
    });
  }
  
  if (keywords.includes('健康') || keywords.includes('运动') || keywords.includes('健身') || keywords.includes('跑步')) {
    suggestions.push({
      title: keywords.includes('跑步') ? '跑步锻炼' : '锻炼身体',
      description: '完成每日运动计划',
      priority: 'high',
      due_date: extractedTime.date,
      start_time: extractedTime.startTime || `${extractedTime.date}T07:00:00`,
      end_time: extractedTime.endTime || `${extractedTime.date}T08:00:00`,
    });
  }
  
  if (keywords.includes('生活') || keywords.includes('家务') || keywords.includes('买菜') || keywords.includes('做饭')) {
    suggestions.push({
      title: keywords.includes('买菜') ? '买菜购物' : keywords.includes('做饭') ? '准备做饭' : '整理房间',
      description: keywords.includes('买菜') ? '去超市购买所需食材' : keywords.includes('做饭') ? '准备食材并烹饪晚餐' : '打扫和整理生活空间',
      priority: 'medium',
      due_date: extractedTime.date,
      start_time: extractedTime.startTime,
      end_time: extractedTime.endTime,
    });
  }
  
  // 如果没有匹配到特定关键词，根据提取的时间创建通用任务
  if (suggestions.length === 0) {
    suggestions.push({
      title: prompt.substring(0, 50),
      description: '根据您的提示创建的任务',
      priority: 'medium',
      due_date: extractedTime.date,
      start_time: extractedTime.startTime,
      end_time: extractedTime.endTime,
    });
  }
  
  return suggestions;
}