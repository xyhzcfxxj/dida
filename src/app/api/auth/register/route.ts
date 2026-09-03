import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseCredentials, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client';

function getAuthClient() {
  const { url } = getSupabaseCredentials();
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
    const { data, error } = await client.auth.signUp({ email, password });

    if (error) {
      return NextResponse.json(
        { error: error.message || '注册失败' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      access_token: data.session?.access_token || null,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      need_email_verification: !data.session,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || '服务器错误' },
      { status: 500 }
    );
  }
}
