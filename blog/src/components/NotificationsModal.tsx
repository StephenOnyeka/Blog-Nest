import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloseCircle,
  Notification as NotificationIcon,
  People,
  Heart,
  DocumentText,
  Trash,
  TickSquare,
} from 'iconsax-react';
import { toast } from 'sonner';
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useDeleteNotification,
} from '../hooks/queries';
import type { ApiNotification } from '../data/api';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'all' | 'unread' | 'read';

/** Helper to format relative time (e.g. 5 mins ago, 2 hours ago, 3 days ago) */
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const navigate = useNavigate();

  const { data: notifications = [], isLoading } = useNotifications(isOpen);
  const markAllRead = useMarkAllNotificationsRead();
  const markOneRead = useMarkNotificationRead();
  const deleteNotif = useDeleteNotification();

  // Filter notifications based on active tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return notifications.filter((n) => !n.is_read);
    }
    if (activeTab === 'read') {
      return notifications.filter((n) => n.is_read);
    }
    return notifications;
  }, [notifications, activeTab]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const readCount = useMemo(() => {
    return notifications.filter((n) => n.is_read).length;
  }, [notifications]);

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        toast.success('All notifications marked as read');
      },
    });
  };

  const handleItemClick = (notif: ApiNotification) => {
    if (!notif.is_read) {
      markOneRead.mutate(notif.id);
    }
    if (notif.article_id || notif.article?.id) {
      const articleId = notif.article?.id || notif.article_id;
      onClose();
      navigate(`/article/${articleId}`);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotif.mutate(id, {
      onSuccess: () => {
        toast.success('Notification deleted');
      },
      onError: () => {
        toast.error('Failed to delete notification');
      },
    });
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return (
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <People size={18} variant="Bold" color="currentColor" />
          </div>
        );
      case 'clap':
        return (
          <div className="w-9 h-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
            <Heart size={18} variant="Bold" color="currentColor" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-full bg-green-50 text-green-700 flex items-center justify-center shrink-0">
            <DocumentText size={18} variant="Bold" color="currentColor" />
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-neutral-100 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <NotificationIcon size={22} variant="Bold" className="text-neutral-900" />
            <h2 className="text-xl font-bold text-neutral-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-neutral-900 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close notifications"
            className="text-neutral-400 hover:text-neutral-700 transition-colors p-1 rounded-lg hover:bg-neutral-100"
          >
            <CloseCircle size={24} variant="Linear" color="currentColor" />
          </button>
        </div>

        {/* Filter Tabs & Header Actions */}
        <div className="flex items-center justify-between pt-3 pb-2 border-b border-neutral-100">
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl">
            {(
              [
                { key: 'all', label: `All (${notifications.length})` },
                { key: 'unread', label: `Unread (${unreadCount})` },
                { key: 'read', label: `Read (${readCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800 transition-colors"
            >
              <TickSquare size={14} variant="Linear" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto flex-1 py-2 space-y-1 divide-y divide-neutral-50">
          {isLoading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 space-y-2">
              <NotificationIcon size={36} className="mx-auto text-neutral-300" variant="Linear" />
              <p className="text-sm font-medium text-neutral-700">
                {activeTab === 'unread'
                  ? 'No unread notifications'
                  : activeTab === 'read'
                  ? 'No read notifications'
                  : 'No notifications yet'}
              </p>
              <p className="text-xs text-neutral-400">
                Read notifications are automatically purged from the database after 30 days.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`group flex items-start justify-between gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                  notif.is_read ? 'hover:bg-neutral-50' : 'bg-neutral-50/70 hover:bg-neutral-100/80 font-medium'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {renderIcon(notif.type)}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs text-neutral-800 leading-snug ${notif.is_read ? '' : 'font-semibold'}`}>
                      {notif.message}
                    </p>
                    <span className="text-[11px] text-neutral-400 mt-1 block">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  {!notif.is_read && (
                    <span
                      className="w-2 h-2 rounded-full bg-green-600"
                      title="Unread"
                    />
                  )}
                  {/* Delete Button for Individual Notification */}
                  <button
                    onClick={(e) => handleDelete(e, notif.id)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-neutral-200/50 transition-all"
                    title="Delete notification"
                  >
                    <Trash size={15} variant="Linear" color="currentColor" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
