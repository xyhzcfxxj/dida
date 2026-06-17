'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, addDays, subDays, addWeeks, subWeeks } from 'date-fns';
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
  
  // Calendar view type state
  const [calendarViewType, setCalendarViewType] = useState<'month' | 'week' | 'day'>('month');
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date()));
  const [currentDay, setCurrentDay] = useState(new Date());
  const [viewingDate, setViewingDate] = useState<Date | null>(null);
  
  // Todos state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedListId, setSelectedListId] = useState('today');
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  
  // Editing state for detail panel
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Dialog states
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'todo' | 'category' | 'event'; id: string } | null>(null);
  
  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskCategoryId, setNewTaskCategoryId] = useState<string>('none');
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
  
  // Sync editingTodo when todos change
  useEffect(() => {
    if (selectedTodoId && editingTodo) {
      const updatedTodo = todos.find(t => t.id === selectedTodoId);
      if (updatedTodo) {
        setEditingTodo(updatedTodo);
        // Only update title/description if they haven't been edited
        if (editTitle === editingTodo.title) {
          setEditTitle(updatedTodo.title);
        }
        if (editDescription === (editingTodo.description || '')) {
          setEditDescription(updatedTodo.description || '');
        }
      } else {
        // Todo was deleted, clear selection
        setSelectedTodoId(null);
        setEditingTodo(null);
      }
    }
  }, [todos, selectedTodoId]);
  
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
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDescription || null,
          priority: newTaskPriority,
          due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
          category_id: newTaskCategoryId === 'none' ? null : newTaskCategoryId,
          sync_to_calendar: true,
        }),
      });
      
      if (res.ok) {
        toast.success('任务创建成功');
        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskPriority('medium');
        setNewTaskDueDate('');
        setNewTaskCategoryId('none');
        setShowTaskDialog(false);
        fetchTodos();
        fetchEvents();
      } else {
        const data = await res.json();
        toast.error(data.error || '创建失败');
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
        // Clear editing state if the completed todo is being edited
        if (selectedTodoId === todo.id) {
          setSelectedTodoId(null);
          setEditingTodo(null);
        }
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
        // Clear editing state if the deleted item is being edited
        if (deleteTarget.type === 'todo' && selectedTodoId === deleteTarget.id) {
          setSelectedTodoId(null);
          setEditingTodo(null);
        }
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
  
  // Week days for week view
  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart),
  });
  
  // Time slots for week/day view (6:00 - 22:00)
  const timeSlots = Array.from({ length: 16 }, (_, i) => i + 6);

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
          <div className="flex h-[calc(100vh-3.5rem)] bg-gray-50">
            {/* Left - Calendar */}
            <div className="flex-1 p-6 overflow-auto">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Calendar Header */}
                <div className="p-4 bg-white border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          if (calendarViewType === 'month') setCurrentMonth(subMonths(currentMonth, 1));
                          else if (calendarViewType === 'week') setCurrentWeekStart(subWeeks(currentWeekStart, 1));
                          else setCurrentDay(subDays(currentDay, 1));
                        }}
                        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-600"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <div className="text-center min-w-[120px]">
                        {calendarViewType === 'month' && (
                          <>
                            <h2 className="text-2xl font-bold text-gray-800">{format(currentMonth, 'yyyy年')}</h2>
                            <p className="text-gray-500">{format(currentMonth, 'MM月')}</p>
                          </>
                        )}
                        {calendarViewType === 'week' && (
                          <>
                            <h2 className="text-lg font-bold text-gray-800">{format(currentWeekStart, 'yyyy年MM月')}</h2>
                            <p className="text-gray-500 text-sm">{format(currentWeekStart, 'd日')} - {format(endOfWeek(currentWeekStart), 'd日')}</p>
                          </>
                        )}
                        {calendarViewType === 'day' && (
                          <>
                            <h2 className="text-2xl font-bold text-gray-800">{format(currentDay, 'M月d日')}</h2>
                            <p className="text-gray-500">{format(currentDay, 'EEEE', { locale: zhCN })}</p>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (calendarViewType === 'month') setCurrentMonth(addMonths(currentMonth, 1));
                          else if (calendarViewType === 'week') setCurrentWeekStart(addWeeks(currentWeekStart, 1));
                          else setCurrentDay(addDays(currentDay, 1));
                        }}
                        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-600"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* View Type Toggle */}
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setCalendarViewType('month')}
                          className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', calendarViewType === 'month' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200')}
                        >
                          月
                        </button>
                        <button
                          onClick={() => setCalendarViewType('week')}
                          className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', calendarViewType === 'week' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200')}
                        >
                          周
                        </button>
                        <button
                          onClick={() => setCalendarViewType('day')}
                          className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', calendarViewType === 'day' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200')}
                        >
                          日
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentMonth(new Date());
                          setCurrentWeekStart(startOfWeek(new Date()));
                          setCurrentDay(new Date());
                        }}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium text-white transition-colors"
                      >
                        今天
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Calendar Content - based on view type */}
                {calendarViewType === 'month' && (
                  <>
                    {/* Week headers */}
                    <div className="grid grid-cols-7 bg-gray-50">
                      {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => (
                        <div key={day} className={cn(
                          'text-center text-sm font-semibold py-3',
                          i === 0 || i === 6 ? 'text-red-400' : 'text-gray-500'
                        )}>
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Month grid */}
                    <div className="grid grid-cols-7 gap-px bg-gray-200">
                      {calendarDays.map(day => {
                        const dayEvents = getEventsForDate(day);
                        const dayTodos = getTodosForDate(day);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isSelected = viewingDate && isSameDay(day, viewingDate);
                        const isDragTarget = draggedTodo && !viewingDate;
                        
                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              'min-h-[100px] p-2 transition-all cursor-pointer',
                              isCurrentMonth ? 'bg-white' : 'bg-gray-100',
                              isSelected && 'bg-blue-50 ring-2 ring-blue-500 ring-inset',
                              isDragTarget && 'hover:bg-blue-50',
                              !isSelected && !isDragTarget && 'hover:bg-gray-50'
                            )}
                            onClick={() => setViewingDate(viewingDate && isSameDay(day, viewingDate) ? null : day)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(day)}
                          >
                            {/* Date number */}
                            <div className={cn(
                              'text-sm font-medium mb-1 w-7 h-7 rounded-full flex items-center justify-center',
                              isToday(day) && 'bg-blue-500 text-white shadow-lg shadow-blue-500/30',
                              !isToday(day) && isCurrentMonth && 'text-gray-700',
                              !isCurrentMonth && 'text-gray-400',
                              isSelected && !isToday(day) && 'bg-blue-100 text-blue-600'
                            )}>
                              {format(day, 'd')}
                            </div>
                            
                            {/* Events */}
                            <div className="space-y-1">
                              {dayEvents.slice(0, 2).map(event => (
                                <div
                                  key={event.id}
                                  className="text-xs px-2 py-1 rounded-md bg-sky-100 text-sky-700 border border-sky-200 truncate"
                                  title={event.title}
                                >
                                  {event.title}
                                </div>
                              ))}
                              
                              {dayTodos.slice(0, 2 - dayEvents.length).map(todo => (
                                <div
                                  key={todo.id}
                                  className={cn(
                                    'text-xs px-2 py-1 rounded-md truncate',
                                    todo.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                                    todo.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                    'bg-amber-100 text-amber-600'
                                  )}
                                  title={todo.title}
                                >
                                  {todo.title}
                                </div>
                              ))}
                              
                              {(dayEvents.length + dayTodos.length > 2) && (
                                <div className="text-xs text-gray-400 px-2">
                                  +{dayEvents.length + dayTodos.length - 2} 更多
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                
                {calendarViewType === 'week' && (
                  <>
                    {/* Week headers */}
                    <div className="grid grid-cols-7 bg-gray-50">
                      {weekDays.map((day, i) => (
                        <div key={day.toISOString()} className={cn(
                          'text-center py-3 border-b',
                          i === 0 || i === 6 ? 'bg-red-50' : '',
                          isToday(day) ? 'bg-blue-50' : ''
                        )}>
                          <div className={cn(
                            'text-sm font-semibold',
                            i === 0 || i === 6 ? 'text-red-400' : 'text-gray-500'
                          )}>
                            {['日', '一', '二', '三', '四', '五', '六'][i]}
                          </div>
                          <div className={cn(
                            'text-lg font-bold mt-1 w-8 h-8 rounded-full mx-auto flex items-center justify-center',
                            isToday(day) && 'bg-blue-500 text-white'
                          )}>
                            {format(day, 'd')}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Week grid with time slots */}
                    <div className="flex-1 overflow-auto">
                      <div className="grid grid-cols-8 min-h-[600px]">
                        {/* Time column */}
                        <div className="bg-gray-50 border-r border-gray-100">
                          {timeSlots.map(hour => (
                            <div key={hour} className="h-[60px] text-xs text-gray-400 text-right pr-2 pt-1 border-b border-gray-100">
                              {hour.toString().padStart(2, '0')}:00
                            </div>
                          ))}
                        </div>
                        
                        {/* Day columns */}
                        {weekDays.map((day, i) => (
                          <div key={day.toISOString()} className={cn(
                            'border-r border-gray-100 relative',
                            i === 0 || i === 6 ? 'bg-red-50/30' : ''
                          )}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(day)}
                          >
                            {timeSlots.map(hour => (
                              <div key={hour} className="h-[60px] border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                                onClick={() => setViewingDate(day)}
                              />
                            ))}
                            
                            {/* Events for this day */}
                            {getEventsForDate(day).map(event => {
                              const startHour = event.start_time ? parseInt(event.start_time.split(':')[0]) : 9;
                              const topPosition = (startHour - 6) * 60;
                              return (
                                <div
                                  key={event.id}
                                  className="absolute left-1 right-1 px-2 py-1 rounded-md bg-sky-100 text-sky-700 border border-sky-200 text-xs truncate cursor-pointer hover:bg-sky-200"
                                  style={{ top: `${topPosition}px`, height: '50px' }}
                                  onClick={() => setViewingDate(day)}
                                  title={event.title}
                                >
                                  {event.title}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {calendarViewType === 'day' && (
                  <div className="flex-1 overflow-auto">
                    {/* Day header */}
                    <div className="p-4 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold',
                            isToday(currentDay) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                          )}>
                            {format(currentDay, 'd')}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{format(currentDay, 'yyyy年M月d日')}</h3>
                            <p className="text-sm text-gray-500">{format(currentDay, 'EEEE', { locale: zhCN })}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Day time slots */}
                    <div className="relative">
                      {timeSlots.map(hour => (
                        <div key={hour} className="flex h-[80px] border-b border-gray-100">
                          <div className="w-[80px] text-xs text-gray-400 text-right pr-3 pt-2 bg-gray-50">
                            {hour.toString().padStart(2, '0')}:00
                          </div>
                          <div className="flex-1 hover:bg-gray-50 cursor-pointer"
                            onClick={() => setViewingDate(currentDay)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(currentDay)}
                          />
                        </div>
                      ))}
                      
                      {/* Events for this day */}
                      {getEventsForDate(currentDay).map(event => {
                        const startHour = event.start_time ? parseInt(event.start_time.split(':')[0]) : 9;
                        const topPosition = (startHour - 6) * 80 + 2;
                        return (
                          <div
                            key={event.id}
                            className="absolute left-[82px] right-2 px-3 py-2 rounded-lg bg-sky-100 text-sky-700 border border-sky-200 hover:bg-sky-200 cursor-pointer"
                            style={{ top: `${topPosition}px`, height: '70px' }}
                            onClick={() => setViewingDate(currentDay)}
                          >
                            <div className="font-medium text-sm truncate">{event.title}</div>
                            {event.start_time && (
                              <div className="text-xs text-sky-500 mt-1">
                                {event.start_time} - {event.end_time || '待定'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right - Todo List / Date Detail */}
            <div className="w-[380px] border-l border-gray-100 bg-white overflow-hidden flex flex-col">
              {viewingDate ? (
                /* Date Detail */
                <div className="flex flex-col h-full">
                  {/* Date Header */}
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {isToday(viewingDate) && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">今天</span>
                          )}
                          {format(viewingDate, 'M月d日', { locale: zhCN })}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {format(viewingDate, 'EEEE', { locale: zhCN })}
                        </p>
                      </div>
                      <button
                        onClick={() => setViewingDate(null)}
                        className="w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Date Content */}
                  <div className="flex-1 overflow-auto p-4">
                    {getEventsForDate(viewingDate).length === 0 && getTodosForDate(viewingDate).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                          <CalendarDays className="h-8 w-8" />
                        </div>
                        <p className="text-sm">暂无日程安排</p>
                        <p className="text-xs mt-1">拖拽左侧待办到日期或点击添加</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Events for selected date */}
                        {getEventsForDate(viewingDate).map(event => (
                          <div key={event.id} className="group p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">{event.title}</span>
                              <button
                                onClick={() => {
                                  setDeleteTarget({ type: 'event', id: event.id });
                                  setShowDeleteDialog(true);
                                }}
                                className="w-8 h-8 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span>
                                {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <span className="text-gray-400">📍</span>
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Todos for selected date */}
                        {getTodosForDate(viewingDate).map(todo => (
                          <div key={todo.id} className="group p-4 rounded-xl bg-gray-50 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={todo.status === 'completed'}
                                onCheckedChange={() => handleToggleComplete(todo)}
                                className="border-2 border-gray-300"
                              />
                              <div className="flex-1">
                                <span className="font-medium text-gray-800">{todo.title}</span>
                                {todo.priority && todo.priority !== 'none' && (
                                  <span className={cn(
                                    'ml-2 px-2 py-0.5 text-xs rounded-full',
                                    todo.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                                    todo.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                    'bg-gray-100 text-gray-500'
                                  )}>
                                    {priorityConfig[todo.priority]?.label}
                                  </span>
                                )}
                              </div>
                              {todo.start_time && (
                                <span className="text-xs text-gray-500">
                                  {format(new Date(todo.start_time), 'HH:mm')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Todo List */
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">待办事项</h3>
                      <button
                        onClick={() => setShowTaskDialog(true)}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        新建
                      </button>
                    </div>
                  </div>
                  
                  {/* Drag hint */}
                  {draggedTodo && (
                    <div className="mx-4 mt-4 p-3 rounded-xl bg-blue-500 text-white text-sm flex items-center gap-2">
                      <GripHorizontal className="h-4 w-4" />
                      拖拽「{draggedTodo.title}」到日历中的日期
                    </div>
                  )}
                  
                  {/* Todo List Content */}
                  <div className="flex-1 overflow-auto p-4">
                    {todos.filter(t => t.status !== 'completed').length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                          <List className="h-8 w-8" />
                        </div>
                        <p className="text-sm">暂无待办事项</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {todos.filter(t => t.status !== 'completed').slice(0, 15).map(todo => (
                          <div
                            key={todo.id}
                            className="group p-3 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md cursor-grab transition-all"
                            draggable
                            onDragStart={() => handleDragStart(todo)}
                            onDragEnd={handleDragEnd}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={false}
                                onCheckedChange={() => handleToggleComplete(todo)}
                                className="border-2 border-gray-300"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-gray-700 truncate">{todo.title}</span>
                              </div>
                              {todo.priority && todo.priority !== 'none' && (
                                <span className={cn(
                                  'px-2 py-0.5 text-xs rounded-full shrink-0',
                                  todo.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                                  todo.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                  todo.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                                  'bg-gray-100 text-gray-500'
                                )}>
                                  {priorityConfig[todo.priority]?.label}
                                </span>
                              )}
                              <GripHorizontal className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {todo.due_date && (
                              <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {isToday(new Date(todo.due_date)) ? '今天' : format(new Date(todo.due_date), 'M月d日')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Completed todos */}
                    {todos.filter(t => t.status === 'completed').length > 0 && (
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-gray-500">已完成</span>
                          <span className="text-xs text-gray-400">{todos.filter(t => t.status === 'completed').length}</span>
                        </div>
                        {todos.filter(t => t.status === 'completed').slice(0, 5).map(todo => (
                          <div key={todo.id} className="p-2 rounded-lg bg-gray-50 mb-1">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked
                                onCheckedChange={() => handleToggleComplete(todo)}
                                className="border-2 border-green-500 bg-green-500"
                              />
                              <span className="text-sm text-gray-400 truncate">{todo.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Todo List View - Three Column Layout */
          <div className="flex h-[calc(100vh-3.5rem)] bg-gray-50">
            {/* Left sidebar - Navigation */}
            <div className="w-[220px] bg-white border-r border-gray-100 overflow-auto">
              <div className="p-4">
                {/* Smart lists */}
                <div className="space-y-1">
                  {smartLists.map(list => (
                    <button
                      key={list.id}
                      onClick={() => {
                        setSelectedListId(list.id);
                        setSelectedTodoId(null);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200',
                        selectedListId === list.id
                          ? 'bg-blue-50 text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <list.icon className={cn(
                        'h-5 w-5 transition-colors',
                        selectedListId === list.id ? 'text-blue-500' : 'text-gray-400'
                      )} />
                      <span className="font-medium">{list.name}</span>
                      {selectedListId === list.id && list.id !== 'completed' && (
                        <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                          {filteredTodos.incomplete.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                
                {/* Divider */}
                <div className="my-4 h-px bg-gray-100" />
                
                {/* Categories */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-3 mb-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">清单</span>
                    <button
                      onClick={() => setShowCategoryDialog(true)}
                      className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <FolderPlus className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                  {categories.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">暂无分类</div>
                  ) : (
                    categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedListId(cat.id);
                          setSelectedTodoId(null);
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200',
                          selectedListId === cat.id
                            ? 'bg-gray-100 text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium">{cat.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            {/* Middle - Task List */}
            <div className="w-[360px] bg-gray-50 border-r border-gray-100 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      selectedListId === 'today' ? 'bg-orange-100' : 
                      selectedListId === 'inbox' ? 'bg-blue-100' : 
                      selectedListId === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                    )}>
                      <listInfo.icon className={cn(
                        'h-4 w-4',
                        selectedListId === 'today' ? 'text-orange-500' : 
                        selectedListId === 'inbox' ? 'text-blue-500' : 
                        selectedListId === 'completed' ? 'text-green-500' : 'text-gray-500'
                      )} style={{ color: listInfo.color || undefined }} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{listInfo.name}</h2>
                      <p className="text-xs text-gray-400">{filteredTodos.incomplete.length} 个任务</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTaskDialog(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    新建
                  </button>
                </div>
              </div>
              
              {/* Task list */}
              <div className="flex-1 overflow-auto p-3 space-y-2">
                {filteredTodos.incomplete.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <Check className="h-8 w-8" />
                    </div>
                    <p className="text-sm">暂无任务</p>
                    <p className="text-xs mt-1">点击上方新建按钮添加任务</p>
                  </div>
                ) : (
                  filteredTodos.incomplete.map(todo => (
                    <div
                      key={todo.id}
                      onClick={() => {
                        setSelectedTodoId(todo.id);
                        setEditingTodo(todo);
                        setEditTitle(todo.title);
                        setEditDescription(todo.description || '');
                      }}
                      className={cn(
                        'group p-3 rounded-xl cursor-pointer transition-all duration-200',
                        selectedTodoId === todo.id
                          ? 'bg-white shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white hover:shadow-sm hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <Checkbox
                            checked={false}
                            onCheckedChange={(checked) => {
                              if (checked) handleToggleComplete(todo);
                            }}
                            className="border-2 border-gray-300 data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'font-medium truncate',
                            selectedTodoId === todo.id ? 'text-gray-900' : 'text-gray-700'
                          )}>
                            {todo.title}
                          </p>
                          {todo.due_date && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className={cn(
                                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                                isToday(new Date(todo.due_date)) 
                                  ? 'bg-orange-100 text-orange-600' 
                                  : 'bg-gray-100 text-gray-500'
                              )}>
                                <Calendar className="h-3 w-3" />
                                {isToday(new Date(todo.due_date)) ? '今天' : format(new Date(todo.due_date), 'M月d日')}
                              </div>
                              {todo.start_time && (
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(todo.start_time), 'HH:mm')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {todo.priority && todo.priority !== 'none' && (
                          <div className={cn(
                            'px-2 py-1 rounded-md text-xs font-medium shrink-0',
                            todo.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                            todo.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                            todo.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                            'bg-gray-100 text-gray-500'
                          )}>
                            {priorityConfig[todo.priority]?.label}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                
                {/* Completed section */}
                {filteredTodos.completed.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 px-3 mb-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-500">已完成</span>
                      <span className="text-xs text-gray-400">{filteredTodos.completed.length}</span>
                    </div>
                    {filteredTodos.completed.slice(0, 5).map(todo => (
                      <div
                        key={todo.id}
                        onClick={() => {
                          setSelectedTodoId(todo.id);
                          setEditingTodo(todo);
                          setEditTitle(todo.title);
                          setEditDescription(todo.description || '');
                        }}
                        className={cn(
                          'group p-2.5 rounded-xl cursor-pointer transition-all',
                          selectedTodoId === todo.id
                            ? 'bg-gray-100 ring-2 ring-green-500/20'
                            : 'hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked
                            onCheckedChange={() => handleToggleComplete(todo)}
                            className="border-2 border-green-500 bg-green-500"
                          />
                          <span className="text-sm text-gray-400 truncate line-through">{todo.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Quick add */}
              <div className="p-3 bg-white border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl">
                    <Plus className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="快速添加任务..."
                      value={quickAddText}
                      onChange={e => setQuickAddText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                    />
                  </div>
                  <button
                    onClick={handleQuickAdd}
                    disabled={!quickAddText.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    添加
                  </button>
                </div>
              </div>
            </div>
            
            {/* Right - Task Detail Panel */}
            <div className="flex-1 bg-white overflow-auto">
              {selectedTodoId && editingTodo ? (
                <div className="max-w-2xl mx-auto p-6">
                  {/* Top bar */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={editingTodo.status === 'completed'}
                        onCheckedChange={() => handleToggleComplete(editingTodo)}
                        className="border-2 border-gray-300 data-[state=checked]:border-green-500 data-[state=checked]:bg-green-500 h-5 w-5"
                      />
                      {editingTodo.due_date && (
                        <div className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
                          isToday(new Date(editingTodo.due_date))
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-gray-100 text-gray-600'
                        )}>
                          <Calendar className="h-4 w-4" />
                          {isToday(new Date(editingTodo.due_date)) ? '今天' : format(new Date(editingTodo.due_date), 'yyyy年M月d日')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDeleteTarget({ type: 'todo', id: editingTodo.id });
                          setShowDeleteDialog(true);
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setSelectedTodoId(null)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Title */}
                  <div className="mb-6">
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full text-2xl font-bold text-gray-900 border-none outline-none focus:ring-0 placeholder:text-gray-300"
                      placeholder="任务标题"
                      onBlur={async () => {
                        if (editTitle !== editingTodo.title) {
                          const token = await getSessionToken();
                          if (token) {
                            await fetch(`/api/todos/${editingTodo.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', 'x-session': token },
                              body: JSON.stringify({ title: editTitle }),
                            });
                            fetchTodos();
                          }
                        }
                      }}
                    />
                  </div>
                  
                  {/* Tags */}
                  <div className="flex items-center gap-3 mb-6">
                    {editingTodo.priority && editingTodo.priority !== 'none' && (
                      <div className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
                        editingTodo.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                        editingTodo.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                        editingTodo.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-500'
                      )}>
                        <Flag className="h-4 w-4" />
                        {priorityConfig[editingTodo.priority]?.label}
                      </div>
                    )}
                    {editingTodo.category && (
                      <div 
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600"
                        style={{ borderLeft: `3px solid ${editingTodo.category.color}` }}
                      >
                        <Tag className="h-4 w-4" />
                        {editingTodo.category.name}
                      </div>
                    )}
                  </div>
                  
                  {/* Time info */}
                  {editingTodo.start_time && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {format(new Date(editingTodo.start_time), 'HH:mm')}
                            {editingTodo.end_time && ` - ${format(new Date(editingTodo.end_time), 'HH:mm')}`}
                          </p>
                          <p className="text-xs text-gray-400">
                            {editingTodo.is_all_day ? '全天' : '时间段'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Divider */}
                  <div className="h-px bg-gray-100 my-6" />
                  
                  {/* Description */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Edit className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">备注</span>
                    </div>
                    <textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      placeholder="添加备注内容..."
                      className="w-full min-h-[160px] p-4 bg-gray-50 rounded-xl text-sm text-gray-700 border-none outline-none resize-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400"
                      onBlur={async () => {
                        if (editDescription !== (editingTodo.description || '')) {
                          const token = await getSessionToken();
                          if (token) {
                            await fetch(`/api/todos/${editingTodo.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', 'x-session': token },
                              body: JSON.stringify({ description: editDescription }),
                            });
                            fetchTodos();
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <List className="h-10 w-10 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">选择一个任务</p>
                  <p className="text-sm text-gray-400 mt-1">在左侧列表中点击任务查看详情</p>
                </div>
              )}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新建任务</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">任务标题</label>
                <Input
                  placeholder="输入任务标题"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">备注</label>
                <Textarea
                  placeholder="添加备注（可选）"
                  value={newTaskDescription}
                  onChange={e => setNewTaskDescription(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">截止日期</label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={e => setNewTaskDueDate(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">优先级</label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high', 'urgent'].map(p => (
                    <button
                      key={p}
                      onClick={() => setNewTaskPriority(p)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        newTaskPriority === p
                          ? p === 'urgent' ? 'bg-red-500 text-white' :
                            p === 'high' ? 'bg-orange-500 text-white' :
                            p === 'medium' ? 'bg-blue-500 text-white' :
                            'bg-gray-500 text-white'
                          : p === 'urgent' ? 'bg-red-100 text-red-600 hover:bg-red-200' :
                            p === 'high' ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' :
                            p === 'medium' ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' :
                            'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {priorityConfig[p]?.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">分类</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setNewTaskCategoryId('none')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      newTaskCategoryId === 'none'
                        ? 'bg-gray-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    无分类
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setNewTaskCategoryId(cat.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        newTaskCategoryId === cat.id
                          ? 'text-white'
                          : 'hover:opacity-80'
                      )}
                      style={{
                        backgroundColor: newTaskCategoryId === cat.id ? cat.color : undefined,
                        color: newTaskCategoryId === cat.id ? '#fff' : undefined,
                        borderLeft: `3px solid ${cat.color}`,
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTaskDialog(false)}>取消</Button>
              <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}>创建</Button>
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