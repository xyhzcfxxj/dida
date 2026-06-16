import { NextRequest, NextResponse } from 'next/server';

interface GenerateRequest {
  prompt: string;
  category_id?: string;
  priority?: string;
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
      return NextResponse.json({ error: '扣子 API 未配置' }, { status: 500 });
    }
    
    // 使用扣子智能体生成待办事项建议
    // 这里可以配置一个专门用于生成待办事项的 Bot ID
    const botId = process.env.COZE_TODO_BOT_ID;
    
    if (!botId) {
      // 如果没有配置 Bot，则返回一个简单的建议
      const suggestions = generateSimpleSuggestions(body.prompt);
      return NextResponse.json({ suggestions });
    }
    
    // 调用扣子 API
    const headers: Record<string, string> = {
      Authorization: `Bearer ${cozeApiToken}`,
      'Content-Type': 'application/json',
    };
    
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
            content: `请根据以下提示生成待办事项建议，格式为JSON数组：${body.prompt}`,
            content_type: 'text',
          },
        ],
        auto_save_history: false,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Coze API error:', errorText);
      return NextResponse.json({ error: '生成失败' }, { status: 500 });
    }
    
    const result = await response.json();
    
    // 解析智能体返回的内容
    const content = result.data?.content || '';
    
    // 尝试从内容中提取 JSON 数组
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    let suggestions = [];
    
    if (jsonMatch) {
      try {
        suggestions = JSON.parse(jsonMatch[0]);
      } catch {
        suggestions = generateSimpleSuggestions(body.prompt);
      }
    } else {
      suggestions = generateSimpleSuggestions(body.prompt);
    }
    
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Generate todo error:', error);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}

// 简单的建议生成（无扣子 Bot 时的备用方案）
function generateSimpleSuggestions(prompt: string) {
  const keywords = prompt.toLowerCase();
  
  const suggestions = [];
  
  // 根据关键词生成建议
  if (keywords.includes('工作') || keywords.includes('项目')) {
    suggestions.push({
      title: '整理工作计划',
      description: '列出本周需要完成的工作任务',
      priority: 'high',
    });
    suggestions.push({
      title: '检查项目进度',
      description: '确认项目各阶段的完成情况',
      priority: 'medium',
    });
  }
  
  if (keywords.includes('学习') || keywords.includes('读书')) {
    suggestions.push({
      title: '阅读学习资料',
      description: '安排学习时间，完成阅读任务',
      priority: 'medium',
    });
    suggestions.push({
      title: '复习笔记',
      description: '整理和复习学习笔记',
      priority: 'low',
    });
  }
  
  if (keywords.includes('健康') || keywords.includes('运动')) {
    suggestions.push({
      title: '锻炼身体',
      description: '完成每日运动计划',
      priority: 'high',
    });
    suggestions.push({
      title: '健康饮食',
      description: '注意饮食均衡，记录饮食情况',
      priority: 'medium',
    });
  }
  
  if (keywords.includes('生活') || keywords.includes('家务')) {
    suggestions.push({
      title: '整理房间',
      description: '打扫和整理生活空间',
      priority: 'low',
    });
    suggestions.push({
      title: '购买生活用品',
      description: '检查并补充日常用品',
      priority: 'medium',
    });
  }
  
  // 默认建议
  if (suggestions.length === 0) {
    suggestions.push({
      title: prompt.substring(0, 50),
      description: '根据您的提示创建的任务',
      priority: 'medium',
    });
  }
  
  return suggestions;
}