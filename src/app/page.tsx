'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar, 
  Flag, 
  Folder,
  LogOut,
  Sparkles,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Todo {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  reminder_time: string | null;
  is_completed: boolean;
  created_at: string;
  categories?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

const statusLabels: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

export default function TodoPage() {
  const { user, signOut, getSessionToken } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // 对话框状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    priority: 'medium',
    due_date: '',
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#3B82F6',
  });
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 获取数据
  const fetchData = useCallback(async () => {
    const token = await getSessionToken();
    if (!token) return;
    
    setIsLoading(true);
    
    try {
      const [todosRes, categoriesRes] = await Promise.all([
        fetch('/api/todos', {
          headers: { 'x-session': token },
        }),
        fetch('/api/categories', {
          headers: { 'x-session': token },
        }),
      ]);
      
      if (todosRes.ok) {
        const todosData = await todosRes.json();
        setTodos(todosData);
      }
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getSessionToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 创建待办事项
  const handleAddTodo = async () => {
    if (!formData.title.trim()) {
      toast.error('请输入任务标题');
      return;
    }
    
    const token = await getSessionToken();
    if (!token) {
      toast.error('请先登录');
      return;
    }
    
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'x-session': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          category_id: formData.category_id || null,
          priority: formData.priority,
          due_date: formData.due_date || null,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setTodos([data, ...todos]);
        setIsAddDialogOpen(false);
        setFormData({
          title: '',
          description: '',
          category_id: '',
          priority: 'medium',
          due_date: '',
        });
        toast.success('任务创建成功');
      } else {
        toast.error(data.error || '创建失败');
      }
    } catch (error) {
      console.error('Add todo error:', error);
      toast.error('创建失败，请稍后重试');
    }
  };

  // 更新待办事项
  const handleUpdateTodo = async () => {
    if (!editingTodo || !formData.title.trim()) {
      toast.error('请输入任务标题');
      return;
    }
    
    const token = await getSessionToken();
    if (!token) {
      toast.error('请先登录');
      return;
    }
    
    try {
      const res = await fetch(`/api/todos/${editingTodo.id}`, {
        method: 'PUT',
        headers: {
          'x-session': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          category_id: formData.category_id || null,
          priority: formData.priority,
          due_date: formData.due_date || null,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setTodos(todos.map(t => t.id === editingTodo.id ? data : t));
        setIsEditDialogOpen(false);
        setEditingTodo(null);
        toast.success('任务更新成功');
      } else {
        toast.error(data.error || '更新失败');
      }
    } catch (error) {
      console.error('Update todo error:', error);
      toast.error('更新失败，请稍后重试');
    }
  };

  // 删除待办事项
  const handleDeleteTodo = async (id: string) => {
    const token = await getSessionToken();
    if (!token) {
      toast.error('请先登录');
      return;
    }
    
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
        headers: { 'x-session': token },
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setTodos(todos.filter(t => t.id !== id));
        setDeletingTodoId(null);
        toast.success('任务已删除');
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Delete todo error:', error);
      toast.error('删除失败，请稍后重试');
    }
  };

  // 标记完成
  const handleToggleComplete = async (todo: Todo) => {
    const token = await getSessionToken();
    if (!token) {
      toast.error('请先登录');
      return;
    }
    
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: {
          'x-session': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_completed: !todo.is_completed,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setTodos(todos.map(t => t.id === todo.id ? data : t));
        toast.success(todo.is_completed ? '任务已标记为未完成' : '任务已完成');
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('Toggle complete error:', error);
      toast.error('操作失败，请稍后重试');
    }
  };

  // 创建分类
  const handleAddCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }
    
    const token = await getSessionToken();
    if (!token) {
      toast.error('请先登录');
      return;
    }
    
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'x-session': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryForm),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setCategories([...categories, data]);
        setIsCategoryDialogOpen(false);
        setCategoryForm({ name: '', color: '#3B82F6' });
        toast.success('分类创建成功');
      } else {
        toast.error(data.error || '创建失败');
      }
    } catch (error) {
      console.error('Add category error:', error);
      toast.error('创建失败，请稍后重试');
    }
  };

  // 扣子自动生成
  const handleGenerate = async () => {
    if (!generatePrompt.trim()) {
      toast.error('请输入生成提示');
      return;
    }
    
    const token = await getSessionToken();
    if (!token) {
      toast.error('请先登录');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const res = await fetch('/api/todos/generate', {
        method: 'POST',
        headers: {
          'x-session': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: generatePrompt }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // 批量创建生成的待办事项
        let createdCount = 0;
        for (const suggestion of data.suggestions) {
          const createRes = await fetch('/api/todos', {
            method: 'POST',
            headers: {
              'x-session': token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: suggestion.title,
              description: suggestion.description,
              priority: suggestion.priority || 'medium',
            }),
          });
          if (createRes.ok) {
            createdCount++;
          }
        }
        
        // 重新获取数据
        fetchData();
        setIsGenerateDialogOpen(false);
        setGeneratePrompt('');
        toast.success(`已生成 ${createdCount} 个任务`);
      } else {
        toast.error(data.error || '生成失败');
      }
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 打开编辑对话框
  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || '',
      category_id: todo.category_id || '',
      priority: todo.priority,
      due_date: todo.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : '',
    });
    setIsEditDialogOpen(true);
  };

  // 过滤待办事项
  const filteredTodos = todos.filter(todo => {
    if (filter === 'pending' && todo.is_completed) return false;
    if (filter === 'completed' && !todo.is_completed) return false;
    if (categoryFilter !== 'all' && todo.category_id !== categoryFilter) return false;
    return true;
  });

  // 获取用户显示名
  const userDisplayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '用户';

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* 头部 */}
        <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">待办事项</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">欢迎，{userDisplayName}</span>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsLogoutDialogOpen(true)}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          {/* 操作栏 */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新建任务
            </Button>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
              <Folder className="h-4 w-4 mr-2" />
              管理分类
            </Button>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI 生成
            </Button>
          </div>

          {/* 过滤器 */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge 
              variant={filter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('all')}
            >
              全部 ({todos.length})
            </Badge>
            <Badge 
              variant={filter === 'pending' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('pending')}
            >
              待处理 ({todos.filter(t => !t.is_completed).length})
            </Badge>
            <Badge 
              variant={filter === 'completed' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('completed')}
            >
              已完成 ({todos.filter(t => t.is_completed).length})
            </Badge>
            
            <Separator orientation="vertical" className="mx-2 h-6" />
            
            <Badge 
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setCategoryFilter('all')}
            >
              所有分类
            </Badge>
            {categories.map(cat => (
              <Badge 
                key={cat.id}
                variant={categoryFilter === cat.id ? 'default' : 'outline'}
                className="cursor-pointer"
                style={{ borderColor: cat.color }}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.name}
              </Badge>
            ))}
          </div>

          {/* 任务列表 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTodos.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Circle className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">暂无待办事项</p>
                <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  创建第一个任务
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {filteredTodos.map(todo => (
                  <Card key={todo.id} className={`transition-all hover:shadow-md ${todo.is_completed ? 'bg-slate-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={todo.is_completed}
                          onCheckedChange={() => handleToggleComplete(todo)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium ${todo.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {todo.title}
                            </span>
                            <Badge className={priorityColors[todo.priority]}>
                              <Flag className="h-3 w-3 mr-1" />
                              {priorityLabels[todo.priority]}
                            </Badge>
                            {todo.categories && (
                              <Badge variant="outline" style={{ borderColor: todo.categories.color }}>
                                {todo.categories.name}
                              </Badge>
                            )}
                          </div>
                          
                          {todo.description && (
                            <p className="text-sm text-slate-500 mb-2">{todo.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            {todo.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(todo.due_date), 'yyyy-MM-dd', { locale: zhCN })}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(todo.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                            </span>
                            {todo.status === 'in_progress' && (
                              <Badge variant="outline" className="text-xs">
                                {statusLabels[todo.status]}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(todo)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setDeletingTodoId(todo.id)}
                          >
                            <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </main>

        {/* 新建任务对话框 */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建任务</DialogTitle>
              <DialogDescription>创建一个新的待办事项</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input 
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入任务标题"
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入任务描述（可选）"
                />
              </div>
              <div className="space-y-2">
                <Label>分类</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={v => setFormData({ ...formData, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>优先级</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={v => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择优先级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>截止日期</Label>
                <Input 
                  type="date"
                  value={formData.due_date}
                  onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>取消</Button>
              <Button onClick={handleAddTodo}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑任务对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑任务</DialogTitle>
              <DialogDescription>修改待办事项内容</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input 
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>分类</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={v => setFormData({ ...formData, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>优先级</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={v => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择优先级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>截止日期</Label>
                <Input 
                  type="date"
                  value={formData.due_date}
                  onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>取消</Button>
              <Button onClick={handleUpdateTodo}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 分类管理对话框 */}
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>管理分类</DialogTitle>
              <DialogDescription>创建新的任务分类</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {categories.map(cat => (
                    <Badge 
                      key={cat.id}
                      style={{ backgroundColor: cat.color, color: 'white' }}
                    >
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Label>分类名称</Label>
                <Input 
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="例如：工作、学习、生活"
                />
              </div>
              <div className="space-y-2">
                <Label>颜色</Label>
                <div className="flex gap-2">
                  {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${categoryForm.color === color ? 'border-slate-800' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCategoryForm({ ...categoryForm, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>取消</Button>
              <Button onClick={handleAddCategory}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI 生成对话框 */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>AI 自动生成</DialogTitle>
              <DialogDescription>描述您的需求，AI 将为您生成待办事项建议</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>描述您的计划</Label>
                <Textarea 
                  value={generatePrompt}
                  onChange={e => setGeneratePrompt(e.target.value)}
                  placeholder="例如：本周的工作计划、健康管理计划、学习计划..."
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <AlertCircle className="h-4 w-4" />
                <span>AI 将根据您的描述生成多个待办事项建议</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>取消</Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                生成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <AlertDialog open={!!deletingTodoId} onOpenChange={() => setDeletingTodoId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                此操作将永久删除该待办事项，无法恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => deletingTodoId && handleDeleteTodo(deletingTodoId)}>
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 登出确认对话框 */}
        <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认退出</AlertDialogTitle>
              <AlertDialogDescription>
                您确定要退出登录吗？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={signOut}>
                退出
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Toast 提示 */}
        <div className="fixed bottom-4 right-4 z-50" />
      </div>
    </AuthGuard>
  );
}