'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { useSupabaseConfig } from '@/lib/supabase-config-inject';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthConfig {
  icon_url: string;
  name: string;
  email_enabled: boolean;
  phone_enabled: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const { isLoading: configLoading } = useSupabaseConfig();
  
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  
  useEffect(() => {
    fetch('/api/auth-config')
      .then(res => res.json())
      .then(data => setAuthConfig(data))
      .catch(err => console.error('Failed to load auth config:', err));
  }, []);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('邮箱或密码错误');
        } else {
          setError(error.message);
        }
        setIsLoading(false);
        return;
      }
      
      if (data.session) {
        router.replace('/');
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }
    
    if (password.length < 6) {
      setError('密码长度至少6位');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }
      
      // 自动确认邮箱，直接登录
      if (data.session) {
        router.replace('/');
      } else {
        setError('注册成功，请登录');
        setIsRegister(false);
        setIsLoading(false);
      }
    } catch (err) {
      setError('注册失败，请稍后重试');
      setIsLoading(false);
    }
  };
  
  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          {authConfig?.icon_url && (
            <div className="flex justify-center">
              <Image 
                src={authConfig.icon_url} 
                alt={authConfig.name || '应用图标'} 
                width={64} 
                height={64}
                className="rounded-lg"
                unoptimized
              />
            </div>
          )}
          <CardTitle className="text-2xl font-bold">
            {authConfig?.name || '待办事项'}
          </CardTitle>
          <CardDescription>
            {isRegister ? '创建新账号' : '登录您的账号'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="请再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRegister ? '注册' : '登录'}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            {isRegister ? (
              <Button 
                variant="link" 
                onClick={() => setIsRegister(false)}
                disabled={isLoading}
              >
                已有账号？去登录
              </Button>
            ) : (
              <Button 
                variant="link" 
                onClick={() => setIsRegister(true)}
                disabled={isLoading}
              >
                还没有账号？去注册
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}