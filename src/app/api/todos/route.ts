import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { InsertTodo, Todo, calendarEvents } from '@/storage/database/shared/schema';

// 获取所有待办事项
export async function GET(req: NextRequest) {
  const token = req.headers.get('x-session');
  
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  const client = getSupabaseClient(token);
  const { data: { user }, error: authError } = await client.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: '认证失败' }, { status: 401 });
  }
  
  const { searchParams } = new URL(req.url);
  const category_id = searchParams.get('category_id');
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  
  let query = client
    .from('todos')
    .select('*, categories(id, name, color, icon)')
    .order('created_at', { ascending: false });
  
  if (category_id) {
    query = query.eq('category_id', category_id);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (priority) {
    query = query.eq('priority', priority);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data as Todo[]);
}

// 创建待办事项
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-session');
  
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  const client = getSupabaseClient(token);
  const { data: { user }, error: authError } = await client.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: '认证失败' }, { status: 401 });
  }
  
  const body = await req.json();
  
  const todoData: InsertTodo = {
    title: body.title,
    description: body.description || null,
    category_id: body.category_id || null,
    priority: body.priority || 'medium',
    status: body.status || 'pending',
    due_date: body.due_date || null,
    reminder_time: body.reminder_time || null,
    is_completed: false,
    user_id: user.id,
  };
  
  const { data, error } = await client
    .from('todos')
    .insert(todoData)
    .select('*, categories(id, name, color, icon)')
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // 同步到日历
  if (body.sync_to_calendar && data) {
    let startTime = body.start_time;
    let endTime = body.end_time;
    
    // 如果设置了截止日期但没有时间，使用截止日期作为日程日期
    if (body.due_date && !startTime) {
      const dueDate = new Date(body.due_date);
      if (body.is_all_day) {
        startTime = dueDate.toISOString();
        endTime = new Date(dueDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
      } else {
        startTime = dueDate.toISOString();
        endTime = new Date(dueDate.getTime() + 2 * 60 * 60 * 1000).toISOString();
      }
    }
    
    if (startTime) {
      const eventData = {
        title: body.title,
        description: body.description || null,
        start_time: startTime,
        end_time: endTime || null,
        is_all_day: body.is_all_day || false,
        event_type: 'task',
        color: '#3B82F6', // 蓝色表示待办相关
        location: null,
        category_id: body.category_id || null,
        todo_id: data.id, // 关联待办
        user_id: user.id,
      };
      
      await client
        .from('calendar_events')
        .insert(eventData);
    }
  }
  
  return NextResponse.json(data as Todo);
}