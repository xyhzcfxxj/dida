'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Plus, Calendar, Inbox, ChevronDown, ChevronRight, Check, Flag, Clock, Tag, MoreHorizontal, Trash2, Edit, Star, Sun, List, FolderPlus, Menu, X, Home, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Types
interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean | null;
  category_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

// Priority colors and labels
const priorityConfig: Record<string, { color: string; bgColor: string; label: string; icon: string }> = {
  urgent: { color: 'text-red-600', bgColor: 'bg-red-100', label: '紧急', icon: 'Flag' },
  high: { color: 'text-orange-600', bgColor: 'bg-orange-100', label: '高', icon: 'Flag' },
  medium: { color: 'text-blue-600', bgColor: 'bg-blue-100', label: '中', icon: 'Flag' },
  low: { color: 'text-gray-600', bgColor: 'bg-gray-100', label: '低', icon: 'Flag' },
};

// Smart lists
const smartLists = [
  { id: 'today', name: '今天', icon: Sun, filter: 'today' },
  { id: 'inbox', name: '收集箱', icon: Inbox, filter: 'inbox' },
  { id: 'all', name: '所有任务', icon: List, filter: 'all' },
  { id: 'completed', name: '已完成', icon: Check, filter: 'completed' },
];

// Date helpers
function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isTomorrow(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  return date < now && !isToday(dateStr);
}

function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '';
  if (isToday(dateStr)) return '今天';
  if (isTomorrow(dateStr)) return '明天';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatTimeDisplay(timeStr: string | null): string {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// Parse date from text (AI智能识别)
function parseDateFromText(text: string): { title: string; due_date: string | null; start_time: string | null; end_time: string | null; priority: string } {
  let title = text;
  let due_date: string | null = null;
  let start_time: string | null = null;
  let end_time: string | null = null;
  let priority: string = 'medium';

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Date patterns
  if (text.includes('今天')) {
    due_date = today.toISOString().split('T')[0];
    title = title.replace('今天', '').trim();
  } else if (text.includes('明天')) {
    due_date = tomorrow.toISOString().split('T')[0];
    title = title.replace('明天', '').trim();
  } else if (text.includes('后天')) {
    const day = new Date();
    day.setDate(day.getDate() + 2);
    due_date = day.toISOString().split('T')[0];
    title = title.replace('后天', '').trim();
  } else if (text.includes('下周')) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    due_date = nextWeek.toISOString().split('T')[0];
    title = title.replace('下周', '').trim();
  }

  // Time patterns
  const timeMatch = text.match(/(\d{1,2})[点时](\d{0,2})?/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const baseDate = due_date ? new Date(due_date) : today;
    baseDate.setHours(hour, minute, 0, 0);
    start_time = baseDate.toISOString();
    end_time = new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString();
    title = title.replace(timeMatch[0], '').trim();
  }

  // Time period patterns
  if (text.includes('上午') || text.includes('早上')) {
    const baseDate = due_date ? new Date(due_date) : today;
    baseDate.setHours(9, 0, 0, 0);
    start_time = baseDate.toISOString();
    end_time = new Date(baseDate.getTime() + 3 * 60 * 60 * 1000).toISOString();
    title = title.replace(/上午|早上/g, '').trim();
  } else if (text.includes('下午')) {
    const baseDate = due_date ? new Date(due_date) : today;
    baseDate.setHours(14, 0, 0, 0);
    start_time = baseDate.toISOString();
    end_time = new Date(baseDate.getTime() + 4 * 60 * 60 * 1000).toISOString();
    title = title.replace('下午', '').trim();
  } else if (text.includes('晚上')) {
    const baseDate = due_date ? new Date(due_date) : today;
    baseDate.setHours(19, 0, 0, 0);
    start_time = baseDate.toISOString();
    endDate: new Date(baseDate.getTime() + 3 * 60 * 60 * 1000).toISOString();
    title = title.replace('晚上', '').trim();
  }

  // Priority patterns
  if (text.includes('紧急') || text.includes('马上') || text.includes('立即')) {
    priority = 'urgent';
    title = title.replace(/紧急|马上|立即/g, '').trim();
  } else if (text.includes('重要')) {
    priority = 'high';
    title = title.replace('重要', '').trim();
  } else if (text.includes('有空') || text.includes('方便时')) {
    priority = 'low';
    title = title.replace(/有空|方便时/g, '').trim();
  }

  return { title: title || text, due_date, start_time, end_time, priority };
}

export default function TodosPage() {
  const router = useRouter();
  const { user, isLoading, getSessionToken } = useAuth();
  
  // State
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedList, setSelectedList] = useState('today');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category_id: '',
    due_date: '',
    start_time: '',
    end_time: '',
    is_all_day: false,
  });

  // Fetch todos
  const fetchTodos = useCallback(async () => {
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const res = await fetch('/api/todos', {
        headers: { 'x-session': token },
      });
      const data = await res.json();
      setTodos(Array.isArray(data) ? data : data.todos || []);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    }
  }, [getSessionToken]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const res = await fetch('/api/categories', {
        headers: { 'x-session': token },
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, [getSessionToken]);

  // Initial load
  useEffect(() => {
    if (!isLoading && user) {
      setDataLoading(true);
      Promise.all([fetchTodos(), fetchCategories()])
        .finally(() => setDataLoading(false));
    }
  }, [isLoading, user, fetchTodos, fetchCategories]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // Filter todos by selected list
  const getFilteredTodos = () => {
    let filtered = [...todos];
    
    switch (selectedList) {
      case 'today':
        filtered = filtered.filter(todo => 
          todo.status !== 'completed' && 
          (isToday(todo.due_date) || isToday(todo.start_time) || (!todo.due_date && !todo.start_time))
        );
        break;
      case 'inbox':
        filtered = filtered.filter(todo => 
          todo.status !== 'completed' && !todo.due_date && !todo.start_time && !todo.category_id
        );
        break;
      case 'completed':
        filtered = filtered.filter(todo => todo.status === 'completed');
        break;
      case 'all':
        filtered = filtered.filter(todo => todo.status !== 'completed');
        break;
    }
    
    // Filter by category if selected
    if (selectedCategory) {
      filtered = filtered.filter(todo => todo.category_id === selectedCategory);
    }
    
    // Sort by priority then by due_date
    filtered.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
    
    return filtered;
  };

  // Quick add todo
  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAddText.trim()) {
      const token = await getSessionToken();
      if (!token) return;
      
      const parsed = parseDateFromText(quickAddText);
      
      try {
        const res = await fetch('/api/todos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session': token,
          },
          body: JSON.stringify({
            title: parsed.title,
            priority: parsed.priority,
            due_date: parsed.due_date,
            start_time: parsed.start_time,
            end_time: parsed.end_time,
            category_id: selectedCategory || undefined,
          }),
        });
        
        if (res.ok) {
          toast.success('任务创建成功');
          setQuickAddText('');
          fetchTodos();
        } else {
          const error = await res.json();
          toast.error(error.error || '创建失败');
        }
      } catch (error) {
        toast.error('创建失败');
      }
    }
  };

  // Toggle todo completion
  const handleToggleComplete = async (todo: Todo) => {
    const token = await getSessionToken();
    if (!token) return;
    
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token,
        },
        body: JSON.stringify({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        }),
      });
      
      if (res.ok) {
        toast.success(newStatus === 'completed' ? '任务已完成' : '任务已恢复');
        fetchTodos();
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // Delete todo
  const handleDeleteTodo = async (todoId: string) => {
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
        headers: { 'x-session': token },
      });
      
      if (res.ok) {
        toast.success('任务已删除');
        setExpandedTodo(null);
        fetchTodos();
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // Update todo
  const handleUpdateTodo = async () => {
    if (!editingTodo) return;
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const res = await fetch(`/api/todos/${editingTodo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          category_id: formData.category_id || null,
          due_date: formData.due_date || null,
          start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
          end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
        }),
      });
      
      if (res.ok) {
        toast.success('任务已更新');
        setShowAddDialog(false);
        setEditingTodo(null);
        fetchTodos();
      }
    } catch (error) {
      toast.error('更新失败');
    }
  };

  // Create category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token,
        },
        body: JSON.stringify({
          name: newCategoryName,
          color: '#3B82F6',
        }),
      });
      
      if (res.ok) {
        toast.success('清单创建成功');
        setShowCategoryDialog(false);
        setNewCategoryName('');
        fetchCategories();
      }
    } catch (error) {
      toast.error('创建失败');
    }
  };

  // Open edit dialog
  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || '',
      priority: todo.priority,
      category_id: todo.category_id || '',
      due_date: todo.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : '',
      start_time: todo.start_time ? new Date(todo.start_time).toISOString().slice(0, 16) : '',
      end_time: todo.end_time ? new Date(todo.end_time).toISOString().slice(0, 16) : '',
      is_all_day: todo.is_all_day || false,
    });
    setShowAddDialog(true);
  };

  // Loading state
  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const filteredTodos = getFilteredTodos();
  const selectedListInfo = smartLists.find(l => l.id === selectedList);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-slate-800">待办清单</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <Home className="h-4 w-4" />
              <span className="ml-1">日历视图</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "bg-white border-r border-slate-200 transition-all duration-300",
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-64"
        )}>
          <div className="p-4">
            {/* Smart Lists */}
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">智能清单</h2>
              <div className="space-y-1">
                {smartLists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => {
                      setSelectedList(list.id);
                      setSelectedCategory(null);
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedList === list.id && !selectedCategory
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <list.icon className="h-4 w-4" />
                    <span>{list.name}</span>
                    <span className="ml-auto text-xs text-slate-400">
                      {list.id === 'today' && todos.filter(t => t.status !== 'completed' && isToday(t.due_date || t.start_time)).length}
                      {list.id === 'inbox' && todos.filter(t => t.status !== 'completed' && !t.due_date && !t.category_id).length}
                      {list.id === 'all' && todos.filter(t => t.status !== 'completed').length}
                      {list.id === 'completed' && todos.filter(t => t.status === 'completed').length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">清单</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowCategoryDialog(true)}>
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedList('all');
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedCategory === cat.id
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span>{cat.name}</span>
                    <span className="ml-auto text-xs text-slate-400">
                      {todos.filter(t => t.category_id === cat.id && t.status !== 'completed').length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-[calc(100vh-60px)]">
          {/* Quick Add */}
          <div className="bg-white border-b border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <Plus className="h-5 w-5 text-slate-400" />
              <Input
                placeholder="添加任务，按回车创建（支持智能识别：今天下午3点开会）"
                value={quickAddText}
                onChange={(e) => setQuickAddText(e.target.value)}
                onKeyDown={handleQuickAdd}
                className="flex-1 border-none shadow-none focus-visible:ring-0 text-sm"
              />
              <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
                <Sparkles className="h-4 w-4 text-purple-500" />
              </Button>
            </div>
          </div>

          {/* List Header */}
          <div className="bg-white/50 px-6 py-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              {selectedListInfo && (() => {
                const IconComponent = selectedListInfo.icon;
                return <IconComponent className={cn(
                  "h-5 w-5",
                  selectedList === 'today' ? "text-yellow-500" : 
                  selectedList === 'inbox' ? "text-blue-500" :
                  selectedList === 'completed' ? "text-green-500" : "text-slate-500"
                )} />;
              })()}
              <h2 className="text-base font-semibold text-slate-700">
                {selectedCategory 
                  ? categories.find(c => c.id === selectedCategory)?.name
                  : selectedListInfo?.name
                }
              </h2>
              <Badge variant="secondary" className="text-xs">
                {filteredTodos.length}
              </Badge>
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-auto p-4">
            {filteredTodos.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <List className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>暂无任务</p>
                <p className="text-sm mt-2">在上方输入框添加新任务</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTodos.map(todo => (
                  <div
                    key={todo.id}
                    className={cn(
                      "bg-white rounded-lg border border-slate-200 shadow-sm transition-all",
                      todo.status === 'completed' && "bg-slate-50 opacity-75",
                      expandedTodo === todo.id && "ring-2 ring-blue-200"
                    )}
                  >
                    {/* Task Row */}
                    <div 
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                      onClick={() => setExpandedTodo(expandedTodo === todo.id ? null : todo.id)}
                    >
                      <Checkbox
                        checked={todo.status === 'completed'}
                        onCheckedChange={() => handleToggleComplete(todo)}
                        className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          todo.status === 'completed' ? "text-slate-400 line-through" : "text-slate-700"
                        )}>
                          {todo.title}
                        </p>
                      </div>

                      {/* Priority */}
                      {todo.priority && todo.priority !== 'medium' && (
                        <Flag className={cn(
                          "h-4 w-4",
                          priorityConfig[todo.priority]?.color
                        )} />
                      )}

                      {/* Date */}
                      {(todo.due_date || todo.start_time) && (
                        <div className={cn(
                          "flex items-center gap-1 text-xs",
                          isOverdue(todo.due_date || todo.start_time) && todo.status !== 'completed'
                            ? "text-red-500"
                            : "text-slate-500"
                        )}>
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDateDisplay(todo.due_date || todo.start_time)}
                            {todo.start_time && !todo.is_all_day && ` ${formatTimeDisplay(todo.start_time)}`}
                          </span>
                        </div>
                      )}

                      {/* Category */}
                      {todo.category && (
                        <Badge variant="outline" className="text-xs">
                          {todo.category.name}
                        </Badge>
                      )}

                      {/* Expand indicator */}
                      <ChevronRight className={cn(
                        "h-4 w-4 text-slate-400 transition-transform",
                        expandedTodo === todo.id && "rotate-90"
                      )} />
                    </div>

                    {/* Expanded Details */}
                    {expandedTodo === todo.id && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50">
                        {todo.description && (
                          <p className="text-sm text-slate-600 mb-3">{todo.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                          {todo.due_date && (
                            <span>截止: {formatDateDisplay(todo.due_date)}</span>
                          )}
                          {todo.start_time && (
                            <span>开始: {formatTimeDisplay(todo.start_time)}</span>
                          )}
                          {todo.end_time && (
                            <span>结束: {formatTimeDisplay(todo.end_time)}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(todo)}>
                            <Edit className="h-4 w-4" />
                            编辑
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteTodo(todo.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                            删除
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Flag className={cn(
                                  "h-4 w-4",
                                  priorityConfig[todo.priority]?.color
                                )} />
                                优先级
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {Object.entries(priorityConfig).map(([key, config]) => (
                                <DropdownMenuItem
                                  key={key}
                                  onClick={async () => {
                                    const token = await getSessionToken();
                                    if (!token) return;
                                    await fetch(`/api/todos/${todo.id}`, {
                                      method: 'PUT',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'x-session': token,
                                      },
                                      body: JSON.stringify({ priority: key }),
                                    });
                                    fetchTodos();
                                  }}
                                >
                                  <Flag className={cn("h-4 w-4 mr-2", config.color)} />
                                  {config.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) setEditingTodo(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTodo ? '编辑任务' : '新建任务'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">标题</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="任务标题"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">备注</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="任务备注..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">截止日期</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">开始时间</label>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">优先级</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">清单</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">无分类</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleUpdateTodo}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建清单</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium text-slate-700">清单名称</label>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="例如：工作、学习、生活"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>取消</Button>
            <Button onClick={handleCreateCategory}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}