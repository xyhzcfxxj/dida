export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed';
  due_date?: string;
  start_time?: string;
  end_time?: string;
  category_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  todo_id?: string;
  category_id?: string;
  created_at?: string;
}

export interface User {
  id?: string;
  nickName?: string;
  avatarUrl?: string;
  session?: string;
}
