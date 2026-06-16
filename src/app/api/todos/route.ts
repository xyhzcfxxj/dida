import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { InsertTodo, Todo } from '@/storage/database/shared/schema';

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
  
  return NextResponse.json(data as Todo);
}