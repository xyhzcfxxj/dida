import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { Todo } from '@/storage/database/shared/schema';

// 获取单个待办事项
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.headers.get('x-session');
  const { id } = await params;
  
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  const client = getSupabaseClient(token);
  const { data: { user }, error: authError } = await client.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: '认证失败' }, { status: 401 });
  }
  
  const { data, error } = await client
    .from('todos')
    .select('*, categories(id, name, color, icon)')
    .eq('id', id)
    .maybeSingle();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  if (!data) {
    return NextResponse.json({ error: '待办事项不存在' }, { status: 404 });
  }
  
  return NextResponse.json(data as Todo);
}

// 更新待办事项
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.headers.get('x-session');
  const { id } = await params;
  
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  const client = getSupabaseClient(token);
  const { data: { user }, error: authError } = await client.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: '认证失败' }, { status: 401 });
  }
  
  const body = await req.json();
  
  // 使用 Record<string, unknown> 避免类型冲突
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.category_id !== undefined) updateData.category_id = body.category_id;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.due_date !== undefined) updateData.due_date = body.due_date;
  if (body.reminder_time !== undefined) updateData.reminder_time = body.reminder_time;
  
  // 处理完成状态
  if (body.is_completed !== undefined) {
    updateData.is_completed = body.is_completed;
    if (body.is_completed) {
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.status = 'pending';
      updateData.completed_at = null;
    }
  }
  
  const { data, error } = await client
    .from('todos')
    .update(updateData)
    .eq('id', id)
    .select('*, categories(id, name, color, icon)')
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data as Todo);
}

// 删除待办事项
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.headers.get('x-session');
  const { id } = await params;
  
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  const client = getSupabaseClient(token);
  const { data: { user }, error: authError } = await client.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: '认证失败' }, { status: 401 });
  }
  
  const { error } = await client
    .from('todos')
    .delete()
    .eq('id', id);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}