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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  CalendarDays,
  Sparkles,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Pencil
} from 'lucide-react';
import {
  format,
  startOfDay,
  endOfDay,
  addHours,
  setHours,
  setMinutes,
  isSameDay,
  addDays,
  subDays,
  parseISO,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 类型定义
interface Todo {
  id: number;
  title: string;
  description: string | null;
  category_id: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean | null;
  created_at: string;
}

interface Event {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  is_all_day: boolean;
  color: string | null;
  location: string | null;
  category_id: string | null;
  todo_id: number | null;
  event_type: string | null;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
  icon: string | null;
}

// 详情面板类型
type DetailItem = (Todo & { type: 'todo' }) | (Event & { type: 'event' }) | null;

// 优先级颜色映射
const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

// 颜色选择
const colorOptions = [
  { value: '#3B82F6', label: '蓝色' },
  { value: '#10B981', label: '绿色' },
  { value: '#F59E0B', label: '橙色' },
  { value: '#EF4444', label: '红色' },
  { value: '#8B5CF6', label: '紫色' },
  { value: '#6366F1', label: '靛蓝' },
];

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedItem, setSelectedItem] = useState<DetailItem>(null);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  // 表单数据
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: 'none',
    priority: 'medium',
    due_date: '',
    start_time: '',
    end_time: '',
    is_all_day: false,
    color: '#3B82F6',
    location: '',
  });

  // 获取数据
  const fetchData = useCallback(async () => {
    const token = await getSessionToken();
    if (!token) return;

    try {
      // 获取待办
      const todosRes = await fetch('/api/todos', {
        headers: { 'x-session': token },
      });
      const todosData = await todosRes.json();
      setTodos(Array.isArray(todosData) ? todosData : todosData.todos || []);

      // 获取日程
      const startStr = format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss");
      const endStr = format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss");
      const eventsRes = await fetch(`/api/events?start_date=${startStr}&end_date=${endStr}`, {
        headers: { 'x-session': token },
      });
      const eventsData = await eventsRes.json();
      setEvents(Array.isArray(eventsData) ? eventsData : eventsData.events || []);

      // 获取分类
      const categoriesRes = await fetch('/api/categories', {
        headers: { 'x-session': token },
      });
      const categoriesData = await categoriesRes.json();
      setCategories(Array.isArray(categoriesData) ? categoriesData : categoriesData.categories || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setDataLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // 获取 session token
  const getSessionToken = async (): Promise<string | null> => {
    try {
      const supabase = await import('@/lib/supabase-browser').then(m => m.getSupabaseBrowserClient());
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  };

  // 切换日期
  const goToPrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  // 获取选中日期的待办
  const getTodosForDate = (): Todo[] => {
    return todos.filter(todo => {
      // 过滤掉已有日程关联的待办
      const hasEvent = events.some(event => event.todo_id === todo.id);
      if (hasEvent) return false;

      if (todo.start_time) {
        return isSameDay(parseISO(todo.start_time), selectedDate);
      }
      if (todo.due_date) {
        return isSameDay(parseISO(todo.due_date), selectedDate);
      }
      return false;
    });
  };

  // 获取选中日期的日程
  const getEventsForDate = (): Event[] => {
    return events.filter(event => {
      return isSameDay(parseISO(event.start_time), selectedDate);
    });
  };

  // 时间轴日程（非全天）
  const getTimedEvents = (): Event[] => {
    return getEventsForDate().filter(e => !e.is_all_day).sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  };

  // 全天日程
  const getAllDayEvents = (): Event[] => {
    return getEventsForDate().filter(e => e.is_all_day);
  };

  // 点击待办显示详情
  const handleTodoClick = (todo: Todo) => {
    setSelectedItem({ ...todo, type: 'todo' });
  };

  // 点击日程显示详情
  const handleEventClick = (event: Event) => {
    setSelectedItem({ ...event, type: 'event' });
  };

  // 关闭详情面板
  const closeDetailPanel = () => {
    setSelectedItem(null);
    setIsEditing(false);
  };

  // 标记待办完成
  const handleToggleComplete = async (todo: Todo) => {
    const token = await getSessionToken();
    if (!token) return;

    try {
      const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
      await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-session': token },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(newStatus === 'completed' ? '已完成' : '已恢复');
      fetchData();
    } catch {
      toast.error('操作失败');
    }
  };

  // 删除待办
  const handleDeleteTodo = async (todo: Todo) => {
    const token = await getSessionToken();
    if (!token) return;

    try {
      await fetch(`/api/todos/${todo.id}`, {
        method: 'DELETE',
        headers: { 'x-session': token },
      });
      toast.success('已删除');
      setSelectedItem(null);
      fetchData();
    } catch {
      toast.error('删除失败');
    }
  };

  // 删除日程
  const handleDeleteEvent = async (event: Event) => {
    const token = await getSessionToken();
    if (!token) return;

    try {
      await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        headers: { 'x-session': token },
      });
      toast.success('已删除');
      setSelectedItem(null);
      fetchData();
    } catch {
      toast.error('删除失败');
    }
  };

  // AI 创建待办
  const handleAiCreate = async () => {
    if (!aiInput.trim()) return;

    setIsAiLoading(true);
    const token = await getSessionToken();
    if (!token) {
      setIsAiLoading(false);
      return;
    }

    try {
      // AI 解析
      const aiRes = await fetch('/api/todos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': token },
        body: JSON.stringify({ prompt: aiInput }),
      });
      const aiData = await aiRes.json();

      if (aiData.suggestions && aiData.suggestions.length > 0) {
        const suggestion = aiData.suggestions[0];
        
        // 创建待办
        await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session': token },
          body: JSON.stringify({
            title: suggestion.title,
            description: suggestion.description || '',
            priority: suggestion.priority || 'medium',
            due_date: suggestion.due_date || '',
            start_time: suggestion.start_time || '',
            end_time: suggestion.end_time || '',
            is_all_day: suggestion.is_all_day || false,
            sync_to_calendar: true,
            category_id: formData.category_id === 'none' ? null : formData.category_id,
          }),
        });

        toast.success('创建成功');
        setAiInput('');
        fetchData();
      }
    } catch {
      toast.error('创建失败');
    } finally {
      setIsAiLoading(false);
    }
  };

  // 手动创建待办
  const handleAddTodo = async () => {
    if (!formData.title.trim()) return;

    const token = await getSessionToken();
    if (!token) return;

    try {
      const startTime = formData.is_all_day 
        ? format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ssxxx")
        : formData.start_time 
          ? new Date(formData.start_time).toISOString()
          : format(setHours(setMinutes(startOfDay(selectedDate), 0), 9), "yyyy-MM-dd'T'HH:mm:ssxxx");

      const endTime = formData.is_all_day
        ? format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ssxxx")
        : formData.end_time
          ? new Date(formData.end_time).toISOString()
          : format(setHours(setMinutes(startOfDay(selectedDate), 0), 18), "yyyy-MM-dd'T'HH:mm:ssxxx");

      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': token },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          due_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          is_all_day: formData.is_all_day,
          sync_to_calendar: true,
          category_id: formData.category_id === 'none' ? null : formData.category_id,
        }),
      });

      toast.success('创建成功');
      setIsAddingTodo(false);
      resetForm();
      fetchData();
    } catch {
      toast.error('创建失败');
    }
  };

  // 手动创建日程
  const handleAddEvent = async () => {
    if (!formData.title.trim()) return;

    const token = await getSessionToken();
    if (!token) return;

    try {
      const startTime = formData.is_all_day 
        ? format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ssxxx")
        : new Date(formData.start_time).toISOString();

      const endTime = formData.is_all_day
        ? format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ssxxx")
        : new Date(formData.end_time).toISOString();

      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': token },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          start_time: startTime,
          end_time: endTime,
          is_all_day: formData.is_all_day,
          color: formData.color,
          location: formData.location,
          sync_to_todo: true,
          category_id: formData.category_id === 'none' ? null : formData.category_id,
        }),
      });

      toast.success('日程创建成功');
      setIsAddingEvent(false);
      resetForm();
      fetchData();
    } catch {
      toast.error('创建失败');
    }
  };

  // 更新待办
  const handleUpdateTodo = async () => {
    if (!selectedItem || selectedItem.type !== 'todo') return;

    const token = await getSessionToken();
    if (!token) return;

    try {
      await fetch(`/api/todos/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-session': token },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          category_id: formData.category_id === 'none' ? null : formData.category_id,
        }),
      });

      toast.success('更新成功');
      setIsEditing(false);
      fetchData();
      // 更新选中项
      setSelectedItem({
        ...selectedItem,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        category_id: formData.category_id === 'none' ? null : formData.category_id,
      });
    } catch {
      toast.error('更新失败');
    }
  };

  // 更新日程
  const handleUpdateEvent = async () => {
    if (!selectedItem || selectedItem.type !== 'event') return;

    const token = await getSessionToken();
    if (!token) return;

    try {
      const startTime = formData.is_all_day 
        ? format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ssxxx")
        : formData.start_time 
          ? new Date(formData.start_time).toISOString()
          : selectedItem.start_time;

      const endTime = formData.is_all_day
        ? format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ssxxx")
        : formData.end_time
          ? new Date(formData.end_time).toISOString()
          : selectedItem.end_time;

      await fetch(`/api/events/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-session': token },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          start_time: startTime,
          end_time: endTime,
          is_all_day: formData.is_all_day,
          color: formData.color,
          location: formData.location,
        }),
      });

      toast.success('更新成功');
      setIsEditing(false);
      fetchData();
      setSelectedItem({
        ...selectedItem,
        title: formData.title,
        description: formData.description,
        start_time: startTime,
        end_time: endTime,
        is_all_day: formData.is_all_day,
        color: formData.color,
        location: formData.location,
      });
    } catch {
      toast.error('更新失败');
    }
  };

  // 开始编辑
  const startEdit = () => {
    if (!selectedItem) return;
    
    if (selectedItem.type === 'todo') {
      setFormData({
        title: selectedItem.title,
        description: selectedItem.description || '',
        category_id: selectedItem.category_id || 'none',
        priority: selectedItem.priority,
        due_date: selectedItem.due_date || '',
        start_time: selectedItem.start_time || '',
        end_time: selectedItem.end_time || '',
        is_all_day: selectedItem.is_all_day || false,
        color: '#3B82F6',
        location: '',
      });
    } else {
      setFormData({
        title: selectedItem.title,
        description: selectedItem.description || '',
        category_id: selectedItem.category_id || 'none',
        priority: 'medium',
        due_date: '',
        start_time: selectedItem.start_time,
        end_time: selectedItem.end_time || '',
        is_all_day: selectedItem.is_all_day,
        color: selectedItem.color || '#3B82F6',
        location: selectedItem.location || '',
      });
    }
    setIsEditing(true);
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category_id: 'none',
      priority: 'medium',
      due_date: '',
      start_time: '',
      end_time: '',
      is_all_day: false,
      color: '#3B82F6',
      location: '',
    });
  };

  // 生成时间轴
  const generateTimeSlots = () => {
    const slots = [];
    for (let i = 6; i <= 22; i++) {
      slots.push(i);
    }
    return slots;
  };

  // 获取某时间段的日程
  const getEventsForHour = (hour: number): Event[] => {
    return getTimedEvents().filter(event => {
      const eventHour = new Date(event.start_time).getHours();
      return eventHour === hour;
    });
  };

  // 登出
  const handleLogout = async () => {
    try {
      // 使用 supabase 直接登出
      const supabase = await import('@/lib/supabase-browser').then(m => m.getSupabaseBrowserClient());
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch {
      toast.error('登出失败');
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient from-slate-50 to-blue-50">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b shadow-sm">
          <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-blue-500" />
              <h1 className="text-lg font-bold text-slate-800">日程管理</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {/* AI 快捷输入 */}
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <Input
                  placeholder="输入任务描述..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiCreate()}
                  className="w-48 h-8"
                />
                <Button size="sm" onClick={handleAiCreate} disabled={isAiLoading}>
                  {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '创建'}
                </Button>
              </div>

              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" />
                登出
              </Button>
            </div>
          </div>
        </header>

        {/* 三栏布局 */}
        <div className="flex h-[calc(100vh-60px)]">
          {/* 左侧：日历日视图 */}
          <div className="w-64 bg-white border-r flex flex-col">
            {/* 日期导航 */}
            <div className="p-3 border-b flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={goToPrevDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <div className="text-sm font-medium">
                  {format(selectedDate, 'yyyy年MM月', { locale: zhCN })}
                </div>
                <div className="text-lg font-bold">
                  {format(selectedDate, 'dd日', { locale: zhCN })}
                </div>
                <div className="text-xs text-slate-500">
                  {format(selectedDate, 'EEEE', { locale: zhCN })}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={goToNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" className="mx-3 mb-2" onClick={goToToday}>
              今天
            </Button>

            {/* 时间轴 */}
            <div className="flex-1 overflow-y-auto px-2">
              {/* 全天事件 */}
              {getAllDayEvents().length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-slate-500 mb-1 px-1">全天</div>
                  {getAllDayEvents().map(event => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="p-2 mb-1 rounded-lg cursor-pointer hover:shadow-md transition-shadow text-sm"
                      style={{ backgroundColor: event.color || '#3B82F6', opacity: 0.8 }}
                    >
                      <div className="font-medium text-white truncate">{event.title}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 时间格子 */}
              {generateTimeSlots().map(hour => {
                const hourEvents = getEventsForHour(hour);
                return (
                  <div key={hour} className="flex items-start border-b border-slate-100 min-h-[40px]">
                    <div className="w-12 text-xs text-slate-500 py-1 px-1">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="flex-1 py-1">
                      {hourEvents.map(event => (
                        <div
                          key={event.id}
                          onClick={() => handleEventClick(event)}
                          className="px-2 py-1 mb-1 rounded cursor-pointer hover:shadow-sm transition-shadow text-xs"
                          style={{ backgroundColor: event.color || '#3B82F6', opacity: 0.9 }}
                        >
                          <span className="text-white font-medium truncate">{event.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 添加日程按钮 */}
            <div className="p-2 border-t">
              <Button size="sm" className="w-full" onClick={() => setIsAddingEvent(true)}>
                <Plus className="h-4 w-4 mr-1" />
                新建日程
              </Button>
            </div>
          </div>

          {/* 中间：待办清单 */}
          <div className="w-80 bg-slate-50 border-r flex flex-col">
            <div className="p-3 border-b bg-white flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">待办事项</h2>
              <Button size="sm" onClick={() => setIsAddingTodo(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {dataLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : getTodosForDate().length === 0 && getEventsForDate().length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>今天暂无事项</p>
                </div>
              ) : (
                <>
                  {/* 待办列表 */}
                  {getTodosForDate().map(todo => (
                    <Card
                      key={todo.id}
                      className={`mb-2 cursor-pointer hover:shadow-md transition-shadow ${
                        selectedItem?.type === 'todo' && selectedItem?.id === todo.id ? 'ring-2 ring-blue-500' : ''
                      } ${todo.status === 'completed' ? 'opacity-60' : ''}`}
                      onClick={() => handleTodoClick(todo)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={todo.status === 'completed'}
                            onCheckedChange={() => handleToggleComplete(todo)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-sm ${todo.status === 'completed' ? 'line-through text-slate-500' : ''}`}>
                              {todo.title}
                            </div>
                            {todo.start_time && (
                              <div className="text-xs text-slate-500 mt-1">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {format(parseISO(todo.start_time), 'HH:mm', { locale: zhCN })}
                              </div>
                            )}
                            <Badge className={`mt-1 text-xs ${priorityColors[todo.priority]}`}>
                              {priorityLabels[todo.priority]}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* 从日程同步的待办（作为事件显示） */}
                  {getEventsForDate().filter(e => e.todo_id).map(event => (
                    <Card
                      key={`event-${event.id}`}
                      className={`mb-2 cursor-pointer hover:shadow-md transition-shadow ${
                        selectedItem?.type === 'event' && selectedItem?.id === event.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleEventClick(event)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: event.color || '#3B82F6' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{event.title}</div>
                            {!event.is_all_day && (
                              <div className="text-xs text-slate-500 mt-1">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {format(parseISO(event.start_time), 'HH:mm', { locale: zhCN })}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* 右侧：详情面板 */}
          <div className="flex-1 bg-white flex flex-col">
            {selectedItem ? (
              <>
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-lg">
                    {selectedItem.type === 'todo' ? '待办详情' : '日程详情'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={selectedItem.type === 'todo' ? handleUpdateTodo : handleUpdateEvent}>
                          保存
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                          取消
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={startEdit}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={selectedItem.type === 'todo' ? () => handleDeleteTodo(selectedItem) : () => handleDeleteEvent(selectedItem)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={closeDetailPanel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label>标题</Label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>描述</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>
                      {selectedItem.type === 'todo' && (
                        <>
                          <div>
                            <Label>优先级</Label>
                            <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">低</SelectItem>
                                <SelectItem value="medium">中</SelectItem>
                                <SelectItem value="high">高</SelectItem>
                                <SelectItem value="urgent">紧急</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>分类</Label>
                            <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">无分类</SelectItem>
                                {categories.map(cat => (
                                  <SelectItem key={cat.id} value={String(cat.id)}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                      {selectedItem.type === 'event' && (
                        <>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={formData.is_all_day}
                              onCheckedChange={(checked) => setFormData({ ...formData, is_all_day: checked as boolean })}
                            />
                            <Label>全天事件</Label>
                          </div>
                          {!formData.is_all_day && (
                            <>
                              <div>
                                <Label>开始时间</Label>
                                <Input
                                  type="datetime-local"
                                  value={formData.start_time}
                                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>结束时间</Label>
                                <Input
                                  type="datetime-local"
                                  value={formData.end_time}
                                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                />
                              </div>
                            </>
                          )}
                          <div>
                            <Label>颜色</Label>
                            <Select value={formData.color} onValueChange={(v) => setFormData({ ...formData, color: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {colorOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded" style={{ backgroundColor: opt.value }} />
                                      {opt.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>地点</Label>
                            <Input
                              value={formData.location}
                              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* 标题和状态 */}
                      <div className="flex items-center gap-3">
                        {selectedItem.type === 'todo' && selectedItem.status === 'completed' && (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        )}
                        {selectedItem.type === 'todo' && selectedItem.status !== 'completed' && (
                          <Circle className="h-6 w-6 text-slate-400" />
                        )}
                        {selectedItem.type === 'event' && (
                          <div
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: selectedItem.color || '#3B82F6' }}
                          />
                        )}
                        <h3 className="text-xl font-semibold">{selectedItem.title}</h3>
                      </div>

                      {/* 基本信息 */}
                      <Card>
                        <CardContent className="p-4 space-y-2">
                          {selectedItem.description && (
                            <div>
                              <Label className="text-slate-500">描述</Label>
                              <p className="mt-1">{selectedItem.description}</p>
                            </div>
                          )}

                          {selectedItem.type === 'todo' && (
                            <>
                              <div className="flex items-center gap-2">
                                <Badge className={priorityColors[selectedItem.priority]}>
                                  {priorityLabels[selectedItem.priority]}优先级
                                </Badge>
                                <Badge variant="outline">
                                  {selectedItem.status === 'completed' ? '已完成' : '待处理'}
                                </Badge>
                              </div>
                              {selectedItem.start_time && (
                                <div className="text-sm text-slate-600">
                                  <Clock className="h-4 w-4 inline mr-1" />
                                  {format(parseISO(selectedItem.start_time), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                                </div>
                              )}
                              {selectedItem.due_date && (
                                <div className="text-sm text-slate-600">
                                  截止：{format(parseISO(selectedItem.due_date), 'yyyy-MM-dd', { locale: zhCN })}
                                </div>
                              )}
                              {selectedItem.category_id && (
                                <div className="text-sm text-slate-600">
                                  分类：{categories.find(c => String(c.id) === selectedItem.category_id)?.name || '未分类'}
                                </div>
                              )}
                            </>
                          )}

                          {selectedItem.type === 'event' && (
                            <>
                              <div className="flex items-center gap-2">
                                {selectedItem.is_all_day ? (
                                  <Badge variant="outline">全天</Badge>
                                ) : (
                                  <>
                                    <div className="text-sm text-slate-600">
                                      开始：{format(parseISO(selectedItem.start_time), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                                    </div>
                                    {selectedItem.end_time && (
                                      <div className="text-sm text-slate-600">
                                        结束：{format(parseISO(selectedItem.end_time), 'HH:mm', { locale: zhCN })}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                              {selectedItem.location && (
                                <div className="text-sm text-slate-600">
                                  地点：{selectedItem.location}
                                </div>
                              )}
                            </>
                          )}

                          <div className="text-xs text-slate-400">
                            创建时间：{format(parseISO(selectedItem.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>点击左侧或中间的事项查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 新建待办对话框 */}
        <Dialog open={isAddingTodo} onOpenChange={setIsAddingTodo}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建待办</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>标题</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div>
                <Label>描述</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div>
                <Label>优先级</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.is_all_day}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_all_day: checked as boolean })}
                />
                <Label>全天事件</Label>
              </div>
              {!formData.is_all_day && (
                <>
                  <div>
                    <Label>开始时间</Label>
                    <Input type="datetime-local" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
                  </div>
                  <div>
                    <Label>结束时间</Label>
                    <Input type="datetime-local" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setIsAddingTodo(false); resetForm(); }}>取消</Button>
              <Button onClick={handleAddTodo}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 新建日程对话框 */}
        <Dialog open={isAddingEvent} onOpenChange={setIsAddingEvent}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建日程</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>标题</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div>
                <Label>描述</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.is_all_day}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_all_day: checked as boolean })}
                />
                <Label>全天事件</Label>
              </div>
              {!formData.is_all_day && (
                <>
                  <div>
                    <Label>开始时间</Label>
                    <Input type="datetime-local" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
                  </div>
                  <div>
                    <Label>结束时间</Label>
                    <Input type="datetime-local" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
                  </div>
                </>
              )}
              <div>
                <Label>颜色</Label>
                <Select value={formData.color} onValueChange={(v) => setFormData({ ...formData, color: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: opt.value }} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>地点</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setIsAddingEvent(false); resetForm(); }}>取消</Button>
              <Button onClick={handleAddEvent}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}