import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { InsertCategory, Category } from '@/storage/database/shared/schema';

// 获取所有分类
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
  
  const { data, error } = await client
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data as Category[]);
}

// 创建分类
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
  
  const categoryData: InsertCategory = {
    name: body.name,
    color: body.color || '#3B82F6',
    icon: body.icon || 'folder',
    user_id: user.id,
  };
  
  const { data, error } = await client
    .from('categories')
    .insert(categoryData)
    .select()
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data as Category);
}