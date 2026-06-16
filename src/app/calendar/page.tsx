'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import {
  CalendarDays,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Tag,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  Menu,
  X,
  LayoutGrid,
  LayoutList,
  User,
  LogOut,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  addDays,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  parseISO,
  setHours,
  setMinutes,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// 类型定义
interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'event' | 'task' | 'reminder';
  start_time: string;
  end_time?: string;
  is_all_day: boolean;
  location?: string;
  category_id?: string;
  categories?: Category;
  color: string;
  repeat_type?: string;
  is_completed: boolean;
}

type ViewMode = 'day' | 'week' | 'month';

export default function CalendarPage() {
  const router = useRouter();
  const { user, isLoading, signOut, getSessionToken: authGetSessionToken } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 新日程表单
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'event',
    start_time: '',
    end_time: '',
    is_all_day: false,
    location: '',
    category_id: '',
    color: '#3B82F6',
  });

  // 获取日程事件
  const fetchEvents = useCallback(async () => {
    if (!user) return;
    
    let startDate: Date;
    let endDate: Date;
    
    switch (viewMode) {
      case 'day':
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
        break;
      case 'week':
        startDate = startOfWeek(currentDate, { locale: zhCN });
        endDate = endOfWeek(currentDate, { locale: zhCN });
        break;
      case 'month':
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
        break;
    }
    
    const token = await getSessionToken();
    if (!token) {
      toast.error('获取认证信息失败');
      return;
    }
    
    try {
      const response = await fetch(
        `/api/events?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
        {
          headers: { 'x-session': token },
        }
      );
      
      if (!response.ok) {
        throw new Error('获取日程失败');
      }
      
      const data = await response.json();
      setEvents(data);
    } catch {
      toast.error('获取日程失败');
    }
  }, [user, viewMode, currentDate]);

  // 获取分类
  const fetchCategories = useCallback(async () => {
    if (!user) return;
    
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const response = await fetch('/api/categories', {
        headers: { 'x-session': token },
      });
      
      if (!response.ok) throw new Error('获取分类失败');
      
      const data = await response.json();
      setCategories(data);
    } catch {
      // 静默处理
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchCategories();
    }
  }, [user, fetchEvents, fetchCategories]);

  // 获取 session token
  const getSessionToken = async (): Promise<string | null> => {
    return await authGetSessionToken();
  };

  // 创建日程
  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      toast.error('请输入日程标题');
      return;
    }
    
    const token = await getSessionToken();
    if (!token) {
      toast.error('获取认证信息失败');
      return;
    }
    
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token,
        },
        body: JSON.stringify({
          ...newEvent,
          start_time: newEvent.is_all_day 
            ? selectedDate ? startOfDay(selectedDate).toISOString() : startOfDay(currentDate).toISOString()
            : newEvent.start_time ? new Date(newEvent.start_time).toISOString() : new Date().toISOString(),
          end_time: newEvent.is_all_day 
            ? selectedDate ? endOfDay(selectedDate).toISOString() : endOfDay(currentDate).toISOString()
            : newEvent.end_time ? new Date(newEvent.end_time).toISOString() : null,
        }),
      });
      
      if (!response.ok) throw new Error('创建失败');
      
      toast.success('日程创建成功');
      setIsAddDialogOpen(false);
      setNewEvent({
        title: '',
        description: '',
        event_type: 'event',
        start_time: '',
        end_time: '',
        is_all_day: false,
        location: '',
        category_id: '',
        color: '#3B82F6',
      });
      fetchEvents();
    } catch {
      toast.error('创建日程失败');
    }
  };

  // 更新日程
  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const response = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token,
        },
        body: JSON.stringify({
          ...editingEvent,
          start_time: editingEvent.start_time ? new Date(editingEvent.start_time).toISOString() : undefined,
          end_time: editingEvent.end_time ? new Date(editingEvent.end_time).toISOString() : null,
        }),
      });
      
      if (!response.ok) throw new Error('更新失败');
      
      toast.success('日程更新成功');
      setEditingEvent(null);
      fetchEvents();
    } catch {
      toast.error('更新日程失败');
    }
  };

  // 删除日程
  const handleDeleteEvent = async (eventId: string) => {
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'x-session': token },
      });
      
      if (!response.ok) throw new Error('删除失败');
      
      toast.success('日程已删除');
      fetchEvents();
    } catch {
      toast.error('删除日程失败');
    }
  };

  // 标记完成
  const handleToggleComplete = async (event: CalendarEvent) => {
    const token = await getSessionToken();
    if (!token) return;
    
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token,
        },
        body: JSON.stringify({
          ...event,
          is_completed: !event.is_completed,
        }),
      });
      
      if (!response.ok) throw new Error('更新失败');
      
      toast.success(!event.is_completed ? '已标记完成' : '已取消完成');
      fetchEvents();
    } catch {
      toast.error('操作失败');
    }
  };

  // 导航函数
  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(addDays(currentDate, -1));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
    }
  };
  
  const goToNext = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  // 获取某天的日程
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = parseISO(event.start_time);
      return isSameDay(eventStart, day);
    });
  };

  // 渲染月视图
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { locale: zhCN });
    const days = [];
    
    let day = calendarStart;
    while (day <= monthEnd || days.length % 7 !== 0) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* 周标题 */}
        <div className="grid grid-cols-7 bg-slate-50">
          {weekDays.map((d, i) => (
            <div key={i} className="p-3 text-center text-sm font-medium text-slate-600">
              {d}
            </div>
          ))}
        </div>
        
        {/* 日期格子 */}
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const dayEvents = getEventsForDay(d);
            const isCurrentMonth = isSameMonth(d, currentDate);
            const isToday = isSameDay(d, new Date());
            
            return (
              <div
                key={i}
                className={cn(
                  'min-h-[100px] p-2 border-t border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors',
                  !isCurrentMonth && 'bg-slate-50 text-slate-400',
                  isToday && 'bg-blue-50'
                )}
                onClick={() => {
                  setSelectedDate(d);
                  setViewMode('day');
                }}
              >
                <div className={cn(
                  'text-sm font-medium mb-1',
                  isToday && 'text-blue-600'
                )}>
                  {format(d, 'd')}
                </div>
                
                {/* 日程事件 */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded truncate',
                        event.is_completed && 'opacity-50'
                      )}
                      style={{ 
                        backgroundColor: event.color + '20',
                        color: event.color,
                        borderLeft: `2px solid ${event.color}`,
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-slate-500 px-1.5">
                      +{dayEvents.length - 3} 更多
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

  // 渲染周视图
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: zhCN });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* 周标题 */}
        <div className="grid grid-cols-8 bg-slate-50 border-b border-slate-100">
          <div className="p-3 text-center text-sm font-medium text-slate-600 border-r border-slate-100">
            时间
          </div>
          {days.map((d, i) => (
            <div key={i} className="p-3 text-center border-r border-slate-100 last:border-r-0">
              <div className="text-xs text-slate-500">{format(d, 'EEE', { locale: zhCN })}</div>
              <div className={cn(
                'text-sm font-medium',
                isSameDay(d, new Date()) && 'text-blue-600 bg-blue-100 rounded-full px-2'
              )}>
                {format(d, 'd')}
              </div>
            </div>
          ))}
        </div>
        
        {/* 时间格子 */}
        <div className="overflow-y-auto max-h-[500px]">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-slate-100">
              <div className="p-2 text-xs text-slate-500 text-center border-r border-slate-100">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {days.map((d, dayIndex) => {
                const hourEvents = getEventsForDay(d).filter(event => {
                  if (event.is_all_day) return false;
                  const eventStart = parseISO(event.start_time);
                  return eventStart.getHours() === hour;
                });
                
                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      'min-h-[40px] p-1 border-r border-slate-100 last:border-r-0 hover:bg-slate-50 cursor-pointer',
                      isSameDay(d, new Date()) && hour === new Date().getHours() && 'bg-blue-50'
                    )}
                    onClick={() => {
                      setSelectedDate(d);
                      setNewEvent(prev => ({
                        ...prev,
                        start_time: setHours(setMinutes(d, 0), hour).toISOString(),
                        end_time: setHours(setMinutes(d, 0), hour + 1).toISOString(),
                      }));
                      setIsAddDialogOpen(true);
                    }}
                  >
                    {hourEvents.map(event => (
                      <div
                        key={event.id}
                        className={cn(
                          'text-xs p-1 rounded truncate',
                          event.is_completed && 'opacity-50'
                        )}
                        style={{ 
                          backgroundColor: event.color + '20',
                          color: event.color,
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染日视图
  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* 日期标题 */}
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <div className="text-lg font-semibold text-slate-800">
            {format(currentDate, 'yyyy年M月d日 EEEE', { locale: zhCN })}
          </div>
        </div>
        
        {/* 时间轴 */}
        <div className="overflow-y-auto max-h-[500px]">
          {hours.map(hour => {
            const hourEvents = dayEvents.filter(event => {
              if (event.is_all_day) return false;
              const eventStart = parseISO(event.start_time);
              return eventStart.getHours() === hour;
            });
            
            return (
              <div key={hour} className="flex border-b border-slate-100">
                <div className="w-16 p-2 text-xs text-slate-500 text-center border-r border-slate-100">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div 
                  className="flex-1 min-h-[60px] p-2 hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    setNewEvent(prev => ({
                      ...prev,
                      start_time: setHours(setMinutes(currentDate, 0), hour).toISOString(),
                      end_time: setHours(setMinutes(currentDate, 0), hour + 1).toISOString(),
                    }));
                    setIsAddDialogOpen(true);
                  }}
                >
                  {hourEvents.map(event => (
                    <div
                      key={event.id}
                      className={cn(
                        'p-2 rounded-lg mb-1 border-l-2 cursor-pointer hover:shadow-md transition-shadow',
                        event.is_completed && 'opacity-50'
                      )}
                      style={{ 
                        backgroundColor: event.color + '15',
                        borderLeftColor: event.color,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEvent(event);
                      }}
                    >
                      <div className="font-medium text-sm" style={{ color: event.color }}>
                        {event.title}
                      </div>
                      {event.description && (
                        <div className="text-xs text-slate-500 mt-1 truncate">
                          {event.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(event.start_time), 'HH:mm')}
                        {event.end_time && ` - ${format(parseISO(event.end_time), 'HH:mm')}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* 全天事件 */}
        {dayEvents.filter(e => e.is_all_day).length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <div className="text-sm font-medium text-slate-600 mb-2">全天日程</div>
            <div className="space-y-2">
              {dayEvents.filter(e => e.is_all_day).map(event => (
                <div
                  key={event.id}
                  className={cn(
                    'p-3 rounded-lg border-l-2',
                    event.is_completed && 'opacity-50'
                  )}
                  style={{ 
                    backgroundColor: event.color + '15',
                    borderLeftColor: event.color,
                  }}
                >
                  <div className="font-medium" style={{ color: event.color }}>
                    {event.title}
                  </div>
                  {event.description && (
                    <div className="text-sm text-slate-500 mt-1">
                      {event.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 顶部导航栏 */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-blue-500" />
              <span className="font-bold text-xl text-slate-800">日历</span>
            </div>
            
            {/* 移动端菜单按钮 */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            {/* 导航链接 */}
            <nav className={cn(
              'md:flex items-center gap-6',
              isMobileMenuOpen ? 'absolute top-16 left-0 right-0 bg-white p-4 flex-col shadow-lg' : 'hidden md:flex'
            )}>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-slate-600 hover:text-blue-500"
                onClick={() => router.push('/')}
              >
                <ListTodo className="w-4 h-4" />
                待办事项
              </Button>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-blue-500"
              >
                <CalendarDays className="w-4 h-4" />
                日历
              </Button>
            </nav>
            
            {/* 用户菜单 */}
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">新建日程</span>
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="w-5 h-5 text-slate-600" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2">
                  <div className="p-2 text-sm text-slate-600 mb-2">
                    {user?.email}
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      await signOut();
                      router.push('/login');
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    登出
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 视图切换和导航 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* 视图模式切换 */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
              className={cn(viewMode === 'day' && 'bg-blue-500 text-white')}
            >
              <LayoutList className="w-4 h-4 mr-1" />
              日
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
              className={cn(viewMode === 'week' && 'bg-blue-500 text-white')}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              周
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
              className={cn(viewMode === 'month' && 'bg-blue-500 text-white')}
            >
              <CalendarDays className="w-4 h-4 mr-1" />
              月
            </Button>
          </div>
          
          {/* 日期导航 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <Button variant="outline" size="sm" onClick={goToToday}>
              今天
            </Button>
            
            <div className="text-lg font-semibold text-slate-800">
              {viewMode === 'month' && format(currentDate, 'yyyy年M月', { locale: zhCN })}
              {viewMode === 'week' && `${format(startOfWeek(currentDate, { locale: zhCN }), 'M月d日')} - ${format(endOfWeek(currentDate, { locale: zhCN }), 'M月d日')}`}
              {viewMode === 'day' && format(currentDate, 'yyyy年M月d日', { locale: zhCN })}
            </div>
          </div>
        </div>

        {/* 日历视图 */}
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </main>

      {/* 新建日程对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              新建日程
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题 *</Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                placeholder="输入日程标题"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="输入日程描述"
                rows={3}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newEvent.is_all_day}
                  onCheckedChange={(checked) => setNewEvent(prev => ({ ...prev, is_all_day: checked }))}
                />
                <Label>全天日程</Label>
              </div>
              
              {!newEvent.is_all_day && (
                <>
                  <div className="flex-1">
                    <Label htmlFor="start_time">开始时间</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="end_time">结束时间</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>
            
            {newEvent.is_all_day && selectedDate && (
              <div className="text-sm text-slate-500">
                日程日期: {format(selectedDate, 'yyyy年M月d日', { locale: zhCN })}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="location">地点</Label>
              <Input
                id="location"
                value={newEvent.location}
                onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                placeholder="输入地点"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分类</Label>
                <Select
                  value={newEvent.category_id}
                  onValueChange={(value) => setNewEvent(prev => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">无分类</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>颜色</Label>
                <Select
                  value={newEvent.color}
                  onValueChange={(value) => setNewEvent(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择颜色" />
                  </SelectTrigger>
                  <SelectContent>
                    {['#3B82F6', '#EF4444', '#F97316', '#22C55E', '#8B5CF6', '#EC4899'].map(color => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                          {color === '#3B82F6' ? '蓝色' : color === '#EF4444' ? '红色' : color === '#F97316' ? '橙色' : color === '#22C55E' ? '绿色' : color === '#8B5CF6' ? '紫色' : '粉色'}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddEvent} className="bg-blue-500 hover:bg-blue-600 text-white">
              创建日程
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑日程对话框 */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-500" />
              编辑日程
            </DialogTitle>
          </DialogHeader>
          
          {editingEvent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">标题</Label>
                <Input
                  id="edit-title"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">描述</Label>
                <Textarea
                  id="edit-description"
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingEvent.is_all_day}
                  onCheckedChange={(checked) => setEditingEvent(prev => prev ? { ...prev, is_all_day: checked } : null)}
                />
                <Label>全天日程</Label>
              </div>
              
              {!editingEvent.is_all_day && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>开始时间</Label>
                    <Input
                      type="datetime-local"
                      value={editingEvent.start_time}
                      onChange={(e) => setEditingEvent(prev => prev ? { ...prev, start_time: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>结束时间</Label>
                    <Input
                      type="datetime-local"
                      value={editingEvent.end_time || ''}
                      onChange={(e) => setEditingEvent(prev => prev ? { ...prev, end_time: e.target.value } : null)}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>地点</Label>
                <Input
                  value={editingEvent.location || ''}
                  onChange={(e) => setEditingEvent(prev => prev ? { ...prev, location: e.target.value } : null)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>颜色</Label>
                  <Select
                    value={editingEvent.color}
                    onValueChange={(value) => setEditingEvent(prev => prev ? { ...prev, color: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['#3B82F6', '#EF4444', '#F97316', '#22C55E', '#8B5CF6', '#EC4899'].map(color => (
                        <SelectItem key={color} value={color}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                            {color === '#3B82F6' ? '蓝色' : color === '#EF4444' ? '红色' : color === '#F97316' ? '橙色' : color === '#22C55E' ? '绿色' : color === '#8B5CF6' ? '紫色' : '粉色'}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={editingEvent.is_completed ? 'completed' : 'pending'}
                    onValueChange={(value) => setEditingEvent(prev => prev ? { ...prev, is_completed: value === 'completed' } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待处理</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => {
                if (editingEvent) {
                  handleDeleteEvent(editingEvent.id);
                  setEditingEvent(null);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingEvent(null)}>
                取消
              </Button>
              <Button onClick={handleUpdateEvent} className="bg-blue-500 hover:bg-blue-600 text-white">
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}