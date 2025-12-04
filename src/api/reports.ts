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
      const response: any = await http.post('/api/reports', params);
      return response.data as ReportResponse;
    } catch (error) {
      console.error('Error submitting report:', error);
      const err = error as any;
      return {
        success: false,
        message: err?.response?.data?.message || 'Failed to submit report',
        error: err?.response?.data?.error || 'Unknown error'
      };
    }
  },

  /**
   * Get user's submitted reports
   */
  async getMyReports(): Promise<UserReport[]> {
    try {
      const response: any = await http.get('/api/reports/my-reports');
      return response.data?.reports || [];
    } catch (error) {
      console.error('Error fetching reports:', error);
      return [];
    }
  }
};

export default reportsApi;
