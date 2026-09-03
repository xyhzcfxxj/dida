import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseCredentials, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client';

function getAuthClient() {
  const { url } = getSupabaseCredentials();
  // 优先使用 service_role key，避免 anon key 的限制；没有则回退到 anon key
  const key = getSupabaseServiceRoleKey() || '';
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
    }

    const client = getAuthClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json(
        { error: error.message || '登录失败' },
        { status: 401 }
      );
    }

    if (!data.session) {
      return NextResponse.json({ error: '登录失败，未获取到会话' }, { status: 401 });
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || '服务器错误' },
      { status: 500 }
    );
  }
}
