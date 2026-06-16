import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { SupabaseConfigProvider } from '@/lib/supabase-config-inject';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '待办事项 | 多端同步',
    template: '%s | 待办事项',
  },
  description:
    '一款支持多端同步的待办事项应用，支持网页版和小程序版数据实时同步，集成扣子自动生成记录功能。',
  keywords: [
    '待办事项',
    '任务管理',
    '多端同步',
    '扣子',
    'Coze',
    '效率工具',
  ],
  authors: [{ name: 'Coze Code Team', url: 'https://code.coze.cn' }],
  generator: 'Coze Code',
  openGraph: {
    title: '待办事项 | 多端同步',
    description:
      '一款支持多端同步的待办事项应用，让任务管理更高效。',
    url: 'https://code.coze.cn',
    siteName: '待办事项',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        <SupabaseConfigProvider>
          <AuthProvider>
            {isDev && <Inspector />}
            {children}
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </SupabaseConfigProvider>
      </body>
    </html>
  );
}