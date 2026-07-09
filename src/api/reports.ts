/**
 * Reports API
 * Handles user and message reporting functionality
 */

import { http } from './http';

export type ReportType = 
  | 'harassment'
  | 'spam'
  | 'inappropriate_content'
  | 'fake_profile'
  | 'underage'
  | 'other';

export interface ReportReason {
  type: ReportType;
  label: string;
  description: string;
}

export const REPORT_REASONS: ReportReason[] = [
  {
    type: 'harassment',
    label: 'Harassment',
    description: 'Bullying, threats, or intimidation'
  },
  {
    type: 'spam',
    label: 'Spam',
    description: 'Unwanted promotional content or repetitive messages'
  },
  {
    type: 'inappropriate_content',
    label: 'Inappropriate Content',
    description: 'Explicit, offensive, or disturbing content'
  },
  {
    type: 'fake_profile',
    label: 'Fake Profile',
    description: 'Impersonation or misleading identity'
  },
  {
    type: 'underage',
    label: 'Underage User',
    description: 'User appears to be under 18 years old'
  },
  {
    type: 'other',
    label: 'Other',
    description: 'Other reason not listed above'
  }
];

export interface SubmitReportParams {
  reportedUserId: string;
  reportType: ReportType;
  reason: string;
  messageId?: string;
  chatId?: string;
  additionalDetails?: string;
}

export interface ReportResponse {
  success: boolean;
  message: string;
  reportId?: string;
  error?: string;
}

export interface UserReport {
  id: string;
  report_type: ReportType;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reported_user?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

export const reportsApi = {
  /**
   * Submit a report for a user or message
   */
  async submitReport(params: SubmitReportParams): Promise<ReportResponse> {
    try {
      const response = await http.post<ReportResponse, SubmitReportParams>('/api/reports', params);
      return response;
    } catch (error) {
      const err = error as any;
      // A duplicate report (429) is an expected, user-facing outcome, not a bug -
      // avoid console.error so it doesn't surface as a dev redbox.
      if (err?.status !== 429) {
        console.error('Error submitting report:', error);
      }
      return {
        success: false,
        message: err?.details?.message || err?.message || 'Failed to submit report',
        error: err?.details?.error || 'Unknown error'
      };
    }
  },

  /**
   * Get user's submitted reports
   */
  async getMyReports(): Promise<UserReport[]> {
    try {
      const response = await http.get<{ reports?: UserReport[] }>('/api/reports/my-reports');
      return response?.reports || [];
    } catch (error) {
      console.error('Error fetching reports:', error);
      return [];
    }
  }
};

export default reportsApi;
