import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { CalendarEvent } from '@/storage/database/shared/schema';

// 获取单个日程事件
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.headers.get('x-session');
  
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  const client = getSupabaseClient(token);
  const { data: { user }, error: authError } = await client.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: '认证失败' }, { status: 401 });
  }
  
  const { id } = await params;
  
  const { data, error } = await client
    .from('calendar_events')
    .select('*, categories(id, name, color, icon)')
    .eq('id', id)
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data as CalendarEvent);
}

// 更新日程事件
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.headers.get('x-session');
  
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  const client = getSupabaseClient(token);
  const { data: { user }, error: authError } = await client.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: '认证失败' }, { status: 401 });
  }
  
  const { id } = await params;
  const body = await req.json();
  
  // 使用 Record 类型避免严格类型检查
  const updateData: Record<string, unknown> = {
    title: body.title,
    description: body.description,
    event_type: body.event_type,
    start_time: body.start_time,
    end_time: body.end_time,
    is_all_day: body.is_all_day,
    location: body.location,
    category_id: body.category_id,
    todo_id: body.todo_id,
    color: body.color,
    reminder_time: body.reminder_time,
    repeat_type: body.repeat_type,
    repeat_end_date: body.repeat_end_date,
    is_completed: body.is_completed,
    completed_at: body.is_completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  
  // 移除 undefined 字段
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });
  
  const { data, error } = await client
    .from('calendar_events')
    .update(updateData)
    .eq('id', id)
    .select('*, categories(id, name, color, icon)')
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data as CalendarEvent);
}

// 删除日程事件
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.headers.get('x-session');
  
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  const client = getSupabaseClient(token);
  const { data: { user }, error: authError } = await client.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: '认证失败' }, { status: 401 });
  }
  
  const { id } = await params;
  
  const { error } = await client
    .from('calendar_events')
    .delete()
    .eq('id', id);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}