import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

interface AuthConfig {
  icon_url: string;
  name: string;
  email_enabled: boolean;
  phone_enabled: boolean;
}

export async function GET() {
  try {
    const result = execSync('npx coze-coding-ai supabase auth get-config-v2', {
      encoding: 'utf-8',
      timeout: 30000,
    });
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse auth config');
    }
    
    const config = JSON.parse(jsonMatch[0]);
    
    const authConfig: AuthConfig = {
      icon_url: config.config?.icon_url || '',
      name: config.config?.name || '待办事项',
      email_enabled: config.config?.email_config?.external_email_enabled || false,
      phone_enabled: config.config?.phone_config?.external_phone_enabled || false,
    };
    
    return NextResponse.json(authConfig);
  } catch (error) {
    console.error('Failed to get auth config:', error);
    return NextResponse.json(
      { error: 'Failed to get auth config' },
      { status: 500 }
    );
  }
}