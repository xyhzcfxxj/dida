import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseCredentials } from '@/storage/database/supabase-client';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('x-session') || req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { url } = getSupabaseCredentials();
    const client = createClient(url, token, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Token 无效' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || '服务器错误' },
      { status: 500 }
    );
  }
}
