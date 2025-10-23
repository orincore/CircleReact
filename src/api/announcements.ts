import { http } from "./http";

export interface AnnouncementButton {
  label: string;
  url: string;
}

export interface AnnouncementItem {
  id: string;
  title?: string;
  message: string;
  imageUrl?: string;
  buttons?: AnnouncementButton[];
  linkUrl?: string; // legacy single link
  startsAt?: string;
  endsAt?: string;
  priority?: number;
  audience?: string;
  sendPush?: boolean;
}

export const announcementsApi = {
  getActive: (
    token?: string | null,
    opts?: { placement?: string; audience?: string; country?: string; appVersion?: string }
  ) => {
    const p = new URLSearchParams();
    if (opts?.placement) p.set('placement', opts.placement);
    if (opts?.audience) p.set('audience', opts.audience);
    if (opts?.country) p.set('country', opts.country);
    if (opts?.appVersion) p.set('appVersion', opts.appVersion);
    const qs = p.toString();
    return http.get<{ announcements: AnnouncementItem[] }>(`/api/announcements/active${qs ? `?${qs}` : ''}`, token);
  },
};
