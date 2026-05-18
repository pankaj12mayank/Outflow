'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, AlertCircle, CreditCard, Mail, Zap, Search, PauseCircle } from 'lucide-react';
import { useAuth } from "@/app/hooks/useAuth";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  action_url?: string;
  action_label?: string;
  metadata?: any;
  created_at: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const getToken = () => localStorage.getItem('access_token');

  const fetchNotifications = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/v1/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setNotifications(data);

      const unread = data.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && getToken()) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    await fetch(`/api/v1/notifications/${id}/read`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await fetch('/api/v1/notifications/read-all', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    fetchNotifications();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/v1/notifications/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    fetchNotifications();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'billing_alert': return <CreditCard className="w-4 h-4" />;
      case 'smtp_failure': return <Mail className="w-4 h-4" />;
      case 'subscription_expiry': return <AlertCircle className="w-4 h-4" />;
      case 'ai_usage_alert': return <Zap className="w-4 h-4" />;
      case 'scraping_failure': return <Search className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read) 
    : notifications;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-gray-900 h-full shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 border-b border-gray-800">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded ${filter === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-sm rounded ${filter === 'unread' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Unread ({unreadCount})
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        <div className="overflow-y-auto h-[calc(100vh-130px)]">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification._id}
                className={`p-4 border-b border-gray-800 hover:bg-gray-800/50 ${!notification.is_read ? 'bg-gray-800/30' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)} bg-opacity-20`}>
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`text-sm font-medium ${notification.is_read ? 'text-gray-400' : 'text-white'}`}>
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-purple-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                    {notification.action_url && (
                      <a
                        href={notification.action_url}
                        className="text-sm text-purple-400 hover:text-purple-300 mt-2 inline-block"
                      >
                        {notification.action_label || 'View details'}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="p-1 text-gray-500 hover:text-white"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification._id)}
                      className="p-1 text-gray-500 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


export function NotificationBell() {
  useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      const fetchUnread = async () => {
        try {
          const res = await fetch('/api/v1/notifications/unread-count', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          setUnreadCount(data.unread_count || 0);
        } catch (error) {
          console.error('Failed to fetch unread count:', error);
        }
      };

      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center text-xs font-medium bg-red-500 text-white rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}