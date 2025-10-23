import { API_BASE_URL } from '../config/api.js';
import { http } from './http';

export interface AdminAnnouncementPayload {
  title?: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  buttons?: Array<{ label: string; url: string }>;
  placements?: string[]; // ['global','match','explore']
  audience?: string;
  countries?: string[];
  minAppVersion?: string;
  priority?: number;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
  sendPushOnPublish?: boolean;
}

export const announcementsAdminApi = {
  list: (token?: string | null, opts?: { active?: boolean; placement?: string; limit?: number }) => {
    const p = new URLSearchParams();
    if (opts?.active) p.set('active', 'true');
    if (opts?.placement) p.set('placement', opts.placement);
    if (opts?.limit) p.set('limit', String(opts.limit));
    return http.get<{ announcements: any[] }>(`/api/admin/announcements?${p.toString()}`, token);
  },
  create: (body: AdminAnnouncementPayload, token?: string | null) =>
    http.post<{ announcement: any }, AdminAnnouncementPayload>(`/api/admin/announcements`, body, token),
  update: (id: string, body: Partial<AdminAnnouncementPayload>, token?: string | null) =>
    http.put<{ announcement: any }, Partial<AdminAnnouncementPayload>>(`/api/admin/announcements/${encodeURIComponent(id)}`, body, token),
  publish: (id: string, sendPush: boolean, token?: string | null) =>
    http.patch<{ announcement: any; published: boolean }, { sendPush: boolean }>(`/api/admin/announcements/${encodeURIComponent(id)}/publish`, { sendPush }, token),
  delete: (id: string, token?: string | null) =>
    http.delete<{ success: boolean }>(`/api/admin/announcements/${encodeURIComponent(id)}`, token),
};
