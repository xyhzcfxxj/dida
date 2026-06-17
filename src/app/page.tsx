'use client';

import { useState, useEffect, useCallback, DragEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  GripHorizontal,
  AlertCircle
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

// Todo 类型定义
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
  is_all_day: boolean;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    color: string;
  };
}

// Calendar Event 类型定义
interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  event_type: string;
  color: string;
  todo_id: number | null;
  category_id: string | null;
  location: string | null;
}

// 优先级颜色映射
const priorityColors = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600', label: '低' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-600', label: '中' },
  high: { bg: 'bg-orange-100', text: 'text-orange-600', label: '高' },
  urgent: { bg: 'bg-red-100', text: 'text-red-600', label: '紧急' },
};

// 颜色预设
const colorPresets = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'
];

export default function HomePage() {
  const { user, isLoading, getSessionToken, signOut } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isLoadingTodos, setIsLoadingTodos] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  
  // AI 输入状态
  const [aiInput, setAiInput] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  
  // 拖拽状态
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<Date | null>(null);

  // 获取待办列表
  const fetchTodos = useCallback(async () => {
    if (!user) return;
    setIsLoadingTodos(true);
    try {
      const token = await getSessionToken();
      if (!token) {
        setIsLoadingTodos(false);
        return;
      }
      const response = await fetch('/api/todos', {
        headers: { 'x-session': token },
      });
      if (response.ok) {
        const data = await response.json();
        setTodos(Array.isArray(data) ? data : data.todos || []);
      }
    } catch (error) {
      console.error('获取待办列表失败:', error);
      toast.error('获取待办列表失败');
    } finally {
      setIsLoadingTodos(false);
    }
  }, [user, getSessionToken]);

  // 获取日程
  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setIsLoadingEvents(true);
    try {
      const token = await getSessionToken();
      if (!token) {
        setIsLoadingEvents(false);
        return;
      }
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const response = await fetch(`/api/events?start=${start}&end=${end}`, {
        headers: { 'x-session': token },
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(Array.isArray(data) ? data : data.events || []);
      }
    } catch (error) {
      console.error('获取日程失败:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [user, getSessionToken, currentMonth]);

  // 获取分类
  const fetchCategories = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getSessionToken();
      if (!token) return;
      const response = await fetch('/api/categories', {
        headers: { 'x-session': token },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  }, [user, getSessionToken]);

  useEffect(() => {
    if (user) {
      fetchTodos();
      fetchEvents();
      fetchCategories();
    }
  }, [user, fetchTodos, fetchEvents, fetchCategories]);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [currentMonth, user, fetchEvents]);

  // AI 生成日程/待办
  const handleAiGenerate = async () => {
    if (!aiInput.trim()) {
      toast.error('请输入任务描述');
      return;
    }
    
    setIsAiGenerating(true);
    try {
      const token = await getSessionToken();
      if (!token) {
        toast.error('请先登录');
        setIsAiGenerating(false);
        return;
      }
      
      // 调用 AI 生成 API
      const generateResponse = await fetch('/api/todos/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token,
        },
        body: JSON.stringify({ prompt: aiInput }),
      });
      
      if (!generateResponse.ok) {
        throw new Error('AI 生成失败');
      }
      
      const generateData = await generateResponse.json();
      const suggestion = generateData.suggestions?.[0];
      
      if (suggestion) {
        // 创建待办事项（同时同步到日历）
        const todoResponse = await fetch('/api/todos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session': token,
          },
          body: JSON.stringify({
            title: suggestion.title,
            description: suggestion.description || '',
            priority: suggestion.priority || 'medium',
            due_date: suggestion.due_date || null,
            start_time: suggestion.start_time || null,
            end_time: suggestion.end_time || null,
            is_all_day: suggestion.is_all_day || false,
            sync_to_calendar: true,
          }),
        });
        
        if (todoResponse.ok) {
          toast.success('任务创建成功，已同步到日历');
          fetchTodos();
          fetchEvents();
          setAiInput('');
          setShowAiDialog(false);
        } else {
          const error = await todoResponse.json();
          toast.error(error.error || '创建失败');
        }
      } else {
        toast.error('AI 无法解析您的输入，请尝试更具体的描述');
      }
    } catch (error) {
      console.error('AI 生成失败:', error);
      toast.error('AI 生成失败，请稍后重试');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // 拖拽开始
  const handleDragStart = (e: DragEvent<HTMLDivElement>, todo: Todo) => {
    setDraggedTodo(todo);
    e.dataTransfer.setData('text/plain', todo.id.toString());
    e.dataTransfer.effectAllowed = 'move';
    // 添加拖拽样式
    const target = e.currentTarget;
    setTimeout(() => {
      target.style.opacity = '0.5';
    }, 0);
  };

  // 拖拽结束
  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    setDraggedTodo(null);
    setDropTargetDate(null);
  };

  // 拖拽进入日历格子
  const handleDragEnter = (e: DragEvent<HTMLDivElement>, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetDate(date);
  };

  // 拖拽离开
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50');
  };

  // 拖拽放置 - 创建日程
  const handleDrop = async (e: DragEvent<HTMLDivElement>, date: Date) => {
    e.preventDefault();
    if (!draggedTodo) return;
    
    try {
      const token = await getSessionToken();
      if (!token) {
        toast.error('请先登录');
        return;
      }
      
      // 检查该待办是否已有日程
      const existingEvent = events.find(ev => ev.todo_id === draggedTodo.id);
      
      if (existingEvent) {
        // 更新现有日程的时间
        const response = await fetch(`/api/events/${existingEvent.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-session': token,
          },
          body: JSON.stringify({
            start_time: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
            end_time: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
            is_all_day: true,
          }),
        });
        
        if (response.ok) {
          toast.success('日程时间已更新');
          fetchEvents();
        }
      } else {
        // 创建新日程
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session': token,
          },
          body: JSON.stringify({
            title: draggedTodo.title,
            description: draggedTodo.description,
            start_time: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
            end_time: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
            is_all_day: true,
            todo_id: draggedTodo.id,
            color: colorPresets[0],
            sync_to_todo: false, // 已经是待办，不需要再同步
          }),
        });
        
        if (response.ok) {
          toast.success('已添加到日历');
          fetchEvents();
        } else {
          const error = await response.json();
          toast.error(error.error || '添加失败');
        }
      }
    } catch (error) {
      console.error('拖拽创建日程失败:', error);
      toast.error('操作失败');
    } finally {
      setDraggedTodo(null);
      setDropTargetDate(null);
    }
  };

  // 更新待办状态
  const handleToggleStatus = async (todo: Todo) => {
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    try {
      const token = await getSessionToken();
      if (!token) return;
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        toast.success(newStatus === 'completed' ? '已完成' : '已恢复');
        fetchTodos();
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 删除待办
  const handleDeleteTodo = async (todoId: number) => {
    try {
      const token = await getSessionToken();
      if (!token) return;
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
        headers: { 'x-session': token },
      });
      
      if (response.ok) {
        toast.success('已删除');
        fetchTodos();
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 删除日程
  const handleDeleteEvent = async (eventId: number) => {
    try {
      const token = await getSessionToken();
      if (!token) return;
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'x-session': token },
      });
      
      if (response.ok) {
        toast.success('日程已删除');
        fetchEvents();
        fetchTodos();
      } else {
        const error = await response.json();
        toast.error(error.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 获取某一天的日程
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return isSameDay(eventDate, date);
    });
  };

  // 获取某一天的待办（通过 start_time 或 due_date）
  // 只显示没有同步到日历的待办（避免重复显示）
  const getTodosForDate = (date: Date): Todo[] => {
    return todos.filter(todo => {
      // 如果该待办已有日程关联，不显示（已在日程中显示）
      const hasEvent = events.some(event => event.todo_id === todo.id);
      if (hasEvent) return false;
      
      if (todo.start_time) {
        const todoDate = new Date(todo.start_time);
        return isSameDay(todoDate, date);
      }
      if (todo.due_date) {
        const dueDate = new Date(todo.due_date);
        return isSameDay(dueDate, date);
      }
      return false;
    });
  };

  // 渲染月历格子
  const renderMonthGrid = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    return (
      <div className="flex flex-col h-full border rounded-lg bg-white overflow-hidden">
        {/* 星期标题 */}
        <div className="grid grid-cols-7 border-b bg-slate-50">
          {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
            <div key={d} className={`py-2 text-center text-sm font-medium ${i >= 5 ? 'text-red-400' : 'text-slate-600'}`}>
              {d}
            </div>
          ))}
        </div>
        
        {/* 日期格子 */}
        <div className="grid grid-cols-7 flex-1 overflow-auto">
          {days.map((date, i) => {
            const dayEvents = getEventsForDate(date);
            const dayTodos = getTodosForDate(date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            const isDropTarget = dropTargetDate && isSameDay(date, dropTargetDate);
            const isWeekend = i % 7 >= 5;
            
            return (
              <div
                key={date.toISOString()}
                className={`relative border-r border-b p-1 min-h-[70px] cursor-pointer transition-all
                  ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'bg-white'}
                  ${isSelected ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : ''}
                  ${isDropTarget ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset' : ''}
                  hover:bg-slate-50
                `}
                onClick={() => setSelectedDate(date)}
                onDragEnter={(e) => handleDragEnter(e, date)}
                onDragLeave={handleDragLeave}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, date)}
              >
                {/* 日期数字 */}
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium mb-1
                  ${isToday ? 'bg-blue-500 text-white' : ''}
                  ${isWeekend && isCurrentMonth && !isToday ? 'text-red-400' : ''}
                  ${!isCurrentMonth ? 'text-slate-300' : ''}
                  ${isSelected && !isToday ? 'text-blue-600' : ''}
                  ${!isWeekend && isCurrentMonth && !isToday && !isSelected ? 'text-slate-700' : ''}
                `}>
                  {format(date, 'd')}
                </div>
                
                {/* 日程和待办 */}
                <div className="space-y-0.5 overflow-hidden">
                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className="text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: event.color + '20', color: event.color }}
                      title={`${event.title} - 点击删除`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvent(event.id);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayTodos.filter(t => t.status !== 'completed').slice(0, 2 - dayEvents.length).map(todo => (
                    <div
                      key={todo.id}
                      className="text-xs px-1 py-0.5 rounded truncate bg-blue-50 text-blue-600"
                    >
                      {todo.title}
                    </div>
                  ))}
                  {(dayEvents.length + dayTodos.filter(t => t.status !== 'completed').length) > 2 && (
                    <div className="text-xs text-slate-400 text-center">
                      +{dayEvents.length + dayTodos.filter(t => t.status !== 'completed').length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 未完成的待办列表
  const pendingTodos = todos.filter(t => t.status !== 'completed');
  // 已完成的待办列表
  const completedTodos = todos.filter(t => t.status === 'completed');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient from-slate-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient from-slate-50 to-blue-50">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-6 w-6 text-blue-500" />
              <h1 className="text-xl font-bold text-slate-800">日程管理助手</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* AI 新建按钮 */}
              <Button
                onClick={() => setShowAiDialog(true)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white gap-2"
              >
                <Sparkles className="h-4 w-4" />
                AI新建
              </Button>
              
              {/* 用户信息 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 hidden sm:inline">{user?.email}</span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        {/* 主内容区 - 左右分栏 */}
        <main className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[calc(100vh-120px)]">
            {/* 左侧 - 日历 */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* 月份导航 */}
              <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border">
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold text-slate-800">
                  {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* 日历网格 */}
              <Card className="flex-1 overflow-hidden">
                <CardContent className="p-0 h-full">
                  {renderMonthGrid()}
                </CardContent>
              </Card>
              
              {/* 拖拽提示 */}
              {draggedTodo && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                  <div className="flex items-center gap-2">
                    <GripHorizontal className="h-4 w-4" />
                    <span>拖拽「{draggedTodo.title}」到日历中的日期</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* 右侧 - 待办列表 */}
            <div className="flex flex-col gap-4">
              {/* 待办列表 */}
              <Card className="flex-1 overflow-hidden">
                <CardContent className="p-4 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Circle className="h-5 w-5 text-blue-500" />
                      <span className="font-semibold text-slate-800">待办事项</span>
                    </div>
                    <Badge variant="secondary">{pendingTodos.length} 待处理</Badge>
                  </div>
                  
                  {/* 待办列表 */}
                  <div className="flex-1 overflow-auto space-y-2">
                    {isLoadingTodos ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      </div>
                    ) : pendingTodos.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>暂无待办事项</p>
                        <p className="text-sm mt-1">点击 AI新建 添加任务</p>
                      </div>
                    ) : (
                      pendingTodos.map(todo => (
                        <div
                          key={todo.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, todo)}
                          onDragEnd={handleDragEnd}
                          className="group flex items-center gap-3 p-3 bg-white border rounded-lg cursor-grab hover:shadow-md hover:border-blue-300 transition-all active:cursor-grabbing"
                        >
                          {/* 拖拽手柄 */}
                          <GripHorizontal className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                          
                          {/* 状态复选框 */}
                          <Checkbox
                            checked={false}
                            onCheckedChange={() => handleToggleStatus(todo)}
                            className="border-2"
                          />
                          
                          {/* 内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 truncate">{todo.title}</div>
                            {todo.start_time && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(todo.start_time), 'MM-dd HH:mm')}
                              </div>
                            )}
                          </div>
                          
                          {/* 优先级 */}
                          <Badge className={`${priorityColors[todo.priority as keyof typeof priorityColors]?.bg} ${priorityColors[todo.priority as keyof typeof priorityColors]?.text}`}>
                            {priorityColors[todo.priority as keyof typeof priorityColors]?.label}
                          </Badge>
                          
                          {/* 删除按钮 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                            onClick={() => handleDeleteTodo(todo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* 已完成区域 */}
                  {completedTodos.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-slate-500">已完成 ({completedTodos.length})</span>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-auto">
                        {completedTodos.slice(0, 5).map(todo => (
                          <div key={todo.id} className="flex items-center gap-2 py-1 text-sm text-slate-400">
                            <Checkbox
                              checked={true}
                              onCheckedChange={() => handleToggleStatus(todo)}
                            />
                            <span className="line-through truncate">{todo.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* 使用提示 */}
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-none">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-700">智能助手提示</p>
                      <p className="text-sm text-slate-500 mt-1">
                        输入如「明天下午3点开会」可自动解析时间，支持拖拽待办到日历安排日程
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        
        {/* AI 新建对话框 */}
        <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI 智能新建
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-sm text-slate-500 mb-4">
                用自然语言描述您的任务，AI 会自动解析时间并创建待办和日程
              </p>
              
              <Input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="例如：明天下午3点开会讨论项目进度"
                className="w-full"
                autoFocus
              />
              
              <div className="mt-3 text-xs text-slate-400">
                <p className="font-medium mb-1">支持的时间格式：</p>
                <div className="grid grid-cols-2 gap-1">
                  <span>• 今天/明天/后天</span>
                  <span>• 下周一/本周五</span>
                  <span>• 3月15日/6月20日</span>
                  <span>• 下午3点/上午10点</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleAiGenerate}
                disabled={isAiGenerating || !aiInput.trim()}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    生成任务
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowAiDialog(false)}>
                取消
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}