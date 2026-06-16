import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { InsertCalendarEvent, CalendarEvent, todos } from '@/storage/database/shared/schema';

// 获取日程事件列表
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
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');
  const event_type = searchParams.get('event_type');
  const category_id = searchParams.get('category_id');
  
  let query = client
    .from('calendar_events')
    .select('*, categories(id, name, color, icon)')
    .order('start_time', { ascending: true });
  
  // 按时间范围筛选
  if (start_date && end_date) {
    query = query
      .gte('start_time', start_date)
      .lte('start_time', end_date);
  }
  
  if (event_type) {
    query = query.eq('event_type', event_type);
  }
  
  if (category_id) {
    query = query.eq('category_id', category_id);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data as CalendarEvent[]);
}

// 创建日程事件
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
  
  const eventData: InsertCalendarEvent = {
    title: body.title,
    description: body.description || null,
    event_type: body.event_type || 'event',
    start_time: body.start_time,
    end_time: body.end_time || null,
    is_all_day: body.is_all_day || false,
    location: body.location || null,
    category_id: body.category_id || null,
    todo_id: body.todo_id || null,
    color: body.color || '#3B82F6',
    reminder_time: body.reminder_time || null,
    repeat_type: body.repeat_type || 'none',
    repeat_end_date: body.repeat_end_date || null,
    is_completed: false,
    user_id: user.id,
  };
  
  const { data, error } = await client
    .from('calendar_events')
    .insert(eventData)
    .select('*, categories(id, name, color, icon)')
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // 同步到待办事项（当 event_type 为 task 或 sync_to_todo 为 true）
  if ((body.sync_to_todo || body.event_type === 'task') && data) {
    const todoData = {
      title: body.title,
      description: body.description || null,
      category_id: body.category_id || null,
      priority: 'medium',
      status: 'pending',
      due_date: body.start_time ? new Date(body.start_time).toISOString().split('T')[0] : null,
      is_completed: false,
      user_id: user.id,
    };
    
    const { data: todoDataResult } = await client
      .from('todos')
      .insert(todoData)
      .select()
      .single();
    
    // 更新日程关联待办 ID
    if (todoDataResult) {
      await client
        .from('calendar_events')
        .update({ todo_id: todoDataResult.id })
        .eq('id', data.id);
    }
  }
  
  return NextResponse.json(data as CalendarEvent);
}