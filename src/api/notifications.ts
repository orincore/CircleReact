import { http } from './http';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  timestamp: Date;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface NotificationResponse {
  success: boolean;
  notifications?: Notification[];
  count?: number;
  error?: string;
  message?: string;
}

export const notificationApi = {
  /**
   * Get user notifications
   */
  getNotifications: (token?: string | null, limit?: number): Promise<NotificationResponse> =>
    http.get<NotificationResponse>(`/api/notifications${limit ? `?limit=${limit}` : ''}`, token),

  /**
   * Get unread notification count
   */
  getUnreadCount: (token?: string | null): Promise<NotificationResponse> =>
    http.get<NotificationResponse>('/api/notifications/unread-count', token),

  /**
   * Mark notification as read
   */
  markAsRead: (notificationId: string, token?: string | null): Promise<NotificationResponse> =>
    http.patch<NotificationResponse>(`/api/notifications/${notificationId}/read`, {}, token),

  /**
   * Delete notification
   */
  deleteNotification: (notificationId: string, token?: string | null): Promise<NotificationResponse> =>
    http.delete<NotificationResponse>(`/api/notifications/${notificationId}`, token),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: (token?: string | null): Promise<NotificationResponse> =>
    http.patch<NotificationResponse>('/api/notifications/mark-all-read', {}, token),
};
