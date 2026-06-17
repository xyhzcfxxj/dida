'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Plus, Calendar, Inbox, ChevronDown, ChevronRight, Check, Flag, Clock, Tag, MoreHorizontal, Trash2, Edit, Star, Sun, List, FolderPlus, Menu, X, Home, Sparkles, CalendarDays, ChevronLeft, ChevronRight as ChevronRightIcon, GripHorizontal, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AuthGuard } from '@/components/auth-guard';
import { Toaster } from '@/components/ui/sonner';

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

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  event_type: string;
  color: string;
  location: string | null;
  category_id: string | null;
  todo_id: string | null;
  user_id: string;
  created_at: string;
}

// Priority config
const priorityConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  urgent: { color: 'text-red-600', bgColor: 'bg-red-100', label: '紧急' },
  high: { color: 'text-orange-600', bgColor: 'bg-orange-100', label: '高' },
  medium: { color: 'text-blue-600', bgColor: 'bg-blue-100', label: '中' },
  low: { color: 'text-gray-600', bgColor: 'bg-gray-100', label: '低' },
};

// Smart lists
const smartLists = [
  { id: 'today', name: '今天', icon: Sun },
  { id: 'inbox', name: '收集箱', icon: Inbox },
  { id: 'all', name: '所有任务', icon: List },
  { id: 'completed', name: '已完成', icon: Check },
];

// Main Page Component
export default function HomePage() {
  const { user, isLoading, signOut, getSessionToken } = useAuth();
  const router = useRouter();
  
  // View mode state
  const [viewMode, setViewMode] = useState<'calendar' | 'todos'>('calendar');
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewingDate, setViewingDate] = useState<Date | null>(null);
  
  // Todos state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedListId, setSelectedListId] = useState('today');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  // Dialog states
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'todo' | 'category' | 'event'; id: string } | null>(null);
  
  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [aiInput, setAiInput] = useState('');
  const [showAiDialog, setShowAiDialog] = useState(false);
  
  // Quick add state
  const [quickAddText, setQuickAddText] = useState('');
  
  // Drag state
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null);
  
  // Fetch data
  const fetchTodos = useCallback(async () => {
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const res = await fetch('/api/todos', {
        headers: { 'x-session': token },
      });
      if (res.ok) {
        const data = await res.json();
        setTodos(Array.isArray(data) ? data : data.todos || []);
      }
    } catch {
      toast.error('获取待办失败');
    }
  }, [getSessionToken]);
  
  const fetchCategories = useCallback(async () => {
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const res = await fetch('/api/categories', {
        headers: { 'x-session': token },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : data.categories || []);
      }
    } catch {
      toast.error('获取分类失败');
    }
  }, [getSessionToken]);
  
  const fetchEvents = useCallback(async () => {
    const token = await getSessionToken();
    if (!token) return;
    
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    try {
      const res = await fetch(`/api/events?start_date=${start.toISOString()}&end_date=${end.toISOString()}`, {
        headers: { 'x-session': token },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : data.events || []);
      }
    } catch {
      toast.error('获取日程失败');
    }
  }, [getSessionToken, currentMonth]);
  
  useEffect(() => {
    fetchTodos();
    fetchCategories();
    fetchEvents();
  }, [fetchTodos, fetchCategories, fetchEvents]);
  
  // Filter todos based on selected list
  const getFilteredTodos = () => {
    const incompleteTodos = todos.filter(t => t.status !== 'completed');
    const completedTodos = todos.filter(t => t.status === 'completed');
    
    switch (selectedListId) {
      case 'today':
        return {
          incomplete: incompleteTodos.filter(t => t.due_date && isToday(t.due_date)),
          completed: completedTodos.filter(t => t.due_date && isToday(t.due_date)),
        };
      case 'inbox':
        return {
          incomplete: incompleteTodos.filter(t => !t.due_date),
          completed: completedTodos.filter(t => !t.due_date),
        };
      case 'completed':
        return { incomplete: [], completed: completedTodos };
      case 'all':
        return { incomplete: incompleteTodos, completed: completedTodos };
      default:
        // Category filter
        return {
          incomplete: incompleteTodos.filter(t => t.category_id === selectedListId),
          completed: completedTodos.filter(t => t.category_id === selectedListId),
        };
    }
  };
  
  // Calendar helpers
  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_time), date));
  };
  
  const getTodosForDate = (date: Date) => {
    return todos.filter(todo => {
      if (todo.status === 'completed') return false;
      if (events.some(event => event.todo_id === todo.id)) return false;
      if (todo.start_time && isSameDay(new Date(todo.start_time), date)) return true;
      if (todo.due_date && isSameDay(new Date(todo.due_date), date)) return true;
      return false;
    });
  };
  
  // Task operations
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': token },
        body: JSON.stringify({ title: newTaskTitle, priority: 'medium' }),
      });
      
      if (res.ok) {
        toast.success('任务创建成功');
        setNewTaskTitle('');
        setShowTaskDialog(false);
        fetchTodos();
      } else {
        toast.error('创建失败');
      }
    } catch {
      toast.error('创建失败');
    }
  };
  
  const handleToggleComplete = async (todo: Todo) => {
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-session': token },
        body: JSON.stringify({
          status: todo.status === 'completed' ? 'pending' : 'completed',
        }),
      });
      
      if (res.ok) {
        toast.success(todo.status === 'completed' ? '任务已恢复' : '任务已完成');
        fetchTodos();
      }
    } catch {
      toast.error('操作失败');
    }
  };
  
  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      let endpoint = '';
      if (deleteTarget.type === 'todo') endpoint = `/api/todos/${deleteTarget.id}`;
      else if (deleteTarget.type === 'category') endpoint = `/api/categories/${deleteTarget.id}`;
      else if (deleteTarget.type === 'event') endpoint = `/api/events/${deleteTarget.id}`;
      
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'x-session': token },
      });
      
      if (res.ok) {
        toast.success('删除成功');
        if (deleteTarget.type === 'todo') fetchTodos();
        else if (deleteTarget.type === 'category') fetchCategories();
        else if (deleteTarget.type === 'event') fetchEvents();
      }
    } catch {
      toast.error('删除失败');
    }
    
    setShowDeleteDialog(false);
    setDeleteTarget(null);
  };
  
  // Quick add with AI
  const handleQuickAdd = async () => {
    if (!quickAddText.trim()) return;
    
    const token = await getSessionToken();
    if (!token) return;
    
    // Simple time parsing
    const input = quickAddText.toLowerCase();
    let dueDate = new Date();
    let startTime: string | null = null;
    
    if (input.includes('明天')) {
      dueDate = addDays(new Date(), 1);
    } else if (input.includes('后天')) {
      dueDate = addDays(new Date(), 2);
    }
    
    // Time parsing
    const timeMatch = input.match(/(\d+)[点时]/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const startDate = new Date(dueDate);
      startDate.setHours(input.includes('下午') || hour < 8 ? hour + 12 : hour, 0, 0, 0);
      startTime = startDate.toISOString();
    }
    
    // Clean title
    let title = quickAddText
      .replace(/明天|后天|今天|下午|上午|晚上|早上|\d+[点时]/g, '')
      .trim();
    
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': token },
        body: JSON.stringify({
          title: title || quickAddText,
          priority: input.includes('紧急') ? 'urgent' : 'medium',
          due_date: dueDate.toISOString(),
          start_time: startTime,
          sync_to_calendar: true,
        }),
      });
      
      if (res.ok) {
        toast.success('任务创建成功');
        setQuickAddText('');
        fetchTodos();
        fetchEvents();
      }
    } catch {
      toast.error('创建失败');
    }
  };
  
  // AI Generate
  const handleAiGenerate = async () => {
    if (!aiInput.trim()) return;
    
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const res = await fetch('/api/todos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': token },
        body: JSON.stringify({ prompt: aiInput }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const suggestions = Array.isArray(data) ? data : data.suggestions || [];
        
        if (suggestions.length > 0) {
          const suggestion = suggestions[0];
          
          // Create todo
          const createRes = await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-session': token },
            body: JSON.stringify({
              title: suggestion.title,
              description: suggestion.description,
              priority: suggestion.priority || 'medium',
              due_date: suggestion.due_date,
              start_time: suggestion.start_time,
              end_time: suggestion.end_time,
              sync_to_calendar: true,
            }),
          });
          
          if (createRes.ok) {
            toast.success('任务创建成功');
            setAiInput('');
            setShowAiDialog(false);
            fetchTodos();
            fetchEvents();
          }
        }
      }
    } catch {
      toast.error('AI生成失败');
    }
  };
  
  // Category operations
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': token },
        body: JSON.stringify({ name: newCategoryName, color: newCategoryColor }),
      });
      
      if (res.ok) {
        toast.success('分类创建成功');
        setNewCategoryName('');
        setShowCategoryDialog(false);
        fetchCategories();
      }
    } catch {
      toast.error('创建失败');
    }
  };
  
  // Drag handlers
  const handleDragStart = (todo: Todo) => {
    setDraggedTodo(todo);
  };
  
  const handleDragEnd = () => {
    setDraggedTodo(null);
  };
  
  const handleDrop = async (date: Date) => {
    if (!draggedTodo) return;
    
    const token = await getSessionToken();
    if (!token) return;
    
    // Check if event exists
    const existingEvent = events.find(e => e.todo_id === draggedTodo.id);
    
    if (existingEvent) {
      // Update existing event
      const newStart = new Date(date);
      newStart.setHours(new Date(existingEvent.start_time).getHours());
      
      try {
        await fetch(`/api/events/${existingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-session': token },
          body: JSON.stringify({
            start_time: newStart.toISOString(),
            end_time: new Date(newStart.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          }),
        });
        toast.success('日程已更新');
        fetchEvents();
      } catch {
        toast.error('更新失败');
      }
    } else {
      // Create new event
      try {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session': token },
          body: JSON.stringify({
            title: draggedTodo.title,
            start_time: new Date(date.setHours(9, 0, 0, 0)).toISOString(),
            end_time: new Date(date.setHours(11, 0, 0, 0)).toISOString(),
            todo_id: draggedTodo.id,
          }),
        });
        toast.success('日程已创建');
        fetchEvents();
      } catch {
        toast.error('创建失败');
      }
    }
    
    setDraggedTodo(null);
  };
  
  // Get list info
  const getListInfo = () => {
    if (selectedListId === 'today') return { name: '今天', icon: Sun };
    if (selectedListId === 'inbox') return { name: '收集箱', icon: Inbox };
    if (selectedListId === 'all') return { name: '所有任务', icon: List };
    if (selectedListId === 'completed') return { name: '已完成', icon: Check };
    
    const category = categories.find(c => c.id === selectedListId);
    return category ? { name: category.name, icon: Tag, color: category.color } : { name: '任务', icon: List };
  };
  
  const filteredTodos = getFilteredTodos();
  const listInfo = getListInfo();
  
  // Calendar days
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-blue-500" />
              <span className="font-semibold text-slate-800">日程管理</span>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className={cn('gap-1', viewMode === 'calendar' && 'bg-blue-500 text-white')}
              >
                <Calendar className="h-4 w-4" />
                日历视图
              </Button>
              <Button
                variant={viewMode === 'todos' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('todos')}
                className={cn('gap-1', viewMode === 'todos' && 'bg-blue-500 text-white')}
              >
                <List className="h-4 w-4" />
                待办清单
              </Button>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAiDialog(true)} className="gap-1">
                <Sparkles className="h-4 w-4" />
                AI新建
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-[calc(100vh-14rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : viewMode === 'calendar' ? (
          /* Calendar View */
          <div className="flex h-[calc(100vh-3.5rem)]">
            {/* Left - Calendar */}
            <div className="flex-1 p-4 overflow-auto">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span>{format(currentMonth, 'yyyy年MM月', { locale: zhCN })}</span>
                      <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                      今天
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Week headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map(day => {
                      const dayEvents = getEventsForDate(day);
                      const dayTodos = getTodosForDate(day);
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            'min-h-[80px] p-2 rounded-lg border transition-colors cursor-pointer',
                            isCurrentMonth ? 'bg-white' : 'bg-slate-50',
                            isToday(day) && 'border-blue-500 bg-blue-50',
                            viewingDate && isSameDay(day, viewingDate) && 'ring-2 ring-blue-500',
                            draggedTodo && 'hover:border-blue-500 hover:bg-blue-50',
                            !isCurrentMonth && 'text-slate-400'
                          )}
                          onClick={() => setViewingDate(viewingDate && isSameDay(day, viewingDate) ? null : day)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(day)}
                        >
                          <div className={cn('text-sm mb-1', isToday(day) && 'font-bold text-blue-600')}>
                            {format(day, 'd')}
                          </div>
                          
                          {/* Events */}
                          {dayEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className="text-xs p-1 rounded bg-blue-100 text-blue-700 truncate mb-1"
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          ))}
                          
                          {/* Todos without events */}
                          {dayTodos.slice(0, 1).map(todo => (
                            <div
                              key={todo.id}
                              className="text-xs p-1 rounded bg-orange-100 text-orange-700 truncate"
                              title={todo.title}
                            >
                              {todo.title}
                            </div>
                          ))}
                          
                          {/* More indicator */}
                          {(dayEvents.length > 2 || dayTodos.length > 1) && (
                            <div className="text-xs text-slate-500 text-center">
                              +{dayEvents.length - 2 + Math.max(0, dayTodos.length - 1)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Right - Todo List / Date Detail */}
            <div className="w-[350px] p-4 border-l border-slate-200 bg-white overflow-auto">
              {viewingDate ? (
                /* Date Detail */
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800">
                      {format(viewingDate, 'yyyy年MM月dd日', { locale: zhCN })} 日程
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setViewingDate(null)}>
                      返回
                    </Button>
                  </div>
                  
                  {/* Events for selected date */}
                  {getEventsForDate(viewingDate).map(event => (
                    <div key={event.id} className="p-3 rounded-lg bg-blue-50 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{event.title}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteTarget({ type: 'event', id: event.id });
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-slate-400" />
                        </Button>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                      </div>
                    </div>
                  ))}
                  
                  {/* Todos for selected date */}
                  {getTodosForDate(viewingDate).map(todo => (
                    <div key={todo.id} className="p-3 rounded-lg bg-orange-50 mb-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={todo.status === 'completed'}
                          onCheckedChange={() => handleToggleComplete(todo)}
                        />
                        <span className="text-slate-800">{todo.title}</span>
                      </div>
                    </div>
                  ))}
                  
                  {getEventsForDate(viewingDate).length === 0 && getTodosForDate(viewingDate).length === 0 && (
                    <div className="text-center text-slate-400 py-8">
                      暂无日程
                    </div>
                  )}
                </div>
              ) : (
                /* Todo List */
                <div>
                  <h3 className="font-semibold text-slate-800 mb-4">待办事项</h3>
                  
                  {/* Drag hint */}
                  {draggedTodo && (
                    <div className="bg-blue-500 text-white px-3 py-2 rounded-lg mb-4 text-sm">
                      拖拽「{draggedTodo.title}」到日历中的日期
                    </div>
                  )}
                  
                  {/* Incomplete todos */}
                  {todos.filter(t => t.status !== 'completed').slice(0, 10).map(todo => (
                    <div
                      key={todo.id}
                      className="p-3 rounded-lg bg-white border border-slate-200 mb-2 cursor-grab hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={() => handleDragStart(todo)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => handleToggleComplete(todo)}
                        />
                        <span className="text-slate-800 flex-1">{todo.title}</span>
                        <Badge className={cn('text-xs', priorityConfig[todo.priority]?.bgColor)}>
                          {priorityConfig[todo.priority]?.label || '普通'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {/* Completed todos */}
                  {todos.filter(t => t.status === 'completed').length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm text-slate-500 mb-2">已完成</h4>
                      {todos.filter(t => t.status === 'completed').slice(0, 5).map(todo => (
                        <div key={todo.id} className="p-2 rounded bg-slate-50 mb-1">
                          <div className="flex items-center gap-2">
                            <Checkbox checked onCheckedChange={() => handleToggleComplete(todo)} />
                            <span className="text-slate-400">{todo.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {todos.length === 0 && (
                    <div className="text-center text-slate-400 py-8">
                      暂无待办事项
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Todo List View */
          <div className="flex h-[calc(100vh-3.5rem)]">
            {/* Left sidebar */}
            <div className="w-[240px] border-r border-slate-200 bg-white p-4 overflow-auto">
              {/* Smart lists */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-500 mb-2">智能清单</h3>
                {smartLists.map(list => (
                  <Button
                    key={list.id}
                    variant={selectedListId === list.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2 mb-1"
                    onClick={() => setSelectedListId(list.id)}
                  >
                    <list.icon className="h-4 w-4" />
                    {list.name}
                  </Button>
                ))}
              </div>
              
              {/* Categories */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-500">清单分类</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowCategoryDialog(true)}>
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </div>
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedListId === cat.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2 mb-1"
                    onClick={() => setSelectedListId(cat.id)}
                  >
                    <Tag className="h-4 w-4" style={{ color: cat.color }} />
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Main content */}
            <div className="flex-1 p-6 overflow-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <listInfo.icon className="h-5 w-5" style={{ color: listInfo.color || '#3B82F6' }} />
                  <h2 className="text-xl font-semibold text-slate-800">{listInfo.name}</h2>
                  <Badge variant="secondary" className="ml-2">
                    {filteredTodos.incomplete.length}
                  </Badge>
                </div>
                <Button onClick={() => setShowTaskDialog(true)} className="gap-1">
                  <Plus className="h-4 w-4" />
                  新建任务
                </Button>
              </div>
              
              {/* Task list */}
              <div className="space-y-2">
                {filteredTodos.incomplete.map(todo => (
                  <Card
                    key={todo.id}
                    className={cn(
                      'hover:shadow-md transition-shadow',
                      expandedTaskId === todo.id && 'ring-2 ring-blue-500'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => handleToggleComplete(todo)}
                        />
                        <div className="flex-1" onClick={() => setExpandedTaskId(expandedTaskId === todo.id ? null : todo.id)}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{todo.title}</span>
                            {todo.priority && todo.priority !== 'none' && (
                              <Badge className={cn('text-xs', priorityConfig[todo.priority]?.bgColor)}>
                                {priorityConfig[todo.priority]?.label}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Expanded details */}
                          {expandedTaskId === todo.id && (
                            <div className="mt-2 text-sm text-slate-500">
                              {todo.description && <p className="mb-1">{todo.description}</p>}
                              {todo.due_date && (
                                <p className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(todo.due_date), 'yyyy-MM-dd')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => {
                              setDeleteTarget({ type: 'todo', id: todo.id });
                              setShowDeleteDialog(true);
                            }}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredTodos.incomplete.length === 0 && (
                  <div className="text-center text-slate-400 py-12">
                    暂无任务
                  </div>
                )}
              </div>
              
              {/* Completed section */}
              {filteredTodos.completed.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    已完成 ({filteredTodos.completed.length})
                  </h3>
                  {filteredTodos.completed.slice(0, 10).map(todo => (
                    <div key={todo.id} className="p-2 rounded bg-slate-50 mb-1 flex items-center gap-2">
                      <Checkbox checked onCheckedChange={() => handleToggleComplete(todo)} />
                      <span className="text-slate-400">{todo.title}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Quick add */}
              <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="快速添加任务（如：明天下午开会）"
                    value={quickAddText}
                    onChange={e => setQuickAddText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                  />
                  <Button onClick={handleQuickAdd}>添加</Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* AI Dialog */}
        <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>AI 智能新建</DialogTitle>
              <DialogDescription>输入任务描述，AI 会自动解析时间和内容</DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="如：明天下午3点提交报告"
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAiDialog(false)}>取消</Button>
              <Button onClick={handleAiGenerate}>生成任务</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Task Dialog */}
        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建任务</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="任务标题"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTaskDialog(false)}>取消</Button>
              <Button onClick={handleAddTask}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Category Dialog */}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建分类</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="分类名称"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>取消</Button>
              <Button onClick={handleAddCategory}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>删除后无法恢复，确定要删除吗？</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>取消</Button>
              <Button variant="destructive" onClick={handleDelete}>删除</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Toaster */}
        <Toaster />
      </div>
    </AuthGuard>
  );
}