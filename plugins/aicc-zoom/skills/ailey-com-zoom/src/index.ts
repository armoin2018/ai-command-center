import axios, { AxiosInstance, AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';

interface ZoomConfig {
  clientId: string;
  clientSecret: string;
  accountId?: string;
  timeout?: number;
  rateLimit?: number;
  authType?: 'jwt' | 'oauth';
  subdomain?: string;
}

interface AccountInfo {
  tier: 'free' | 'pro' | 'business' | 'enterprise';
  hasApiAccess: boolean;
  accountId: string;
  accountName: string;
  hostCount: number;
  meetingMinutesUsed: number;
  maxParticipants: number;
  storageGB: number;
  features: string[];
  setupInstructions: string;
  upgradeRequired: boolean;
}

interface Meeting {
  id?: string;
  uuid?: string;
  topic: string;
  type: 'instant' | 'scheduled' | 'recurring';
  start_time: Date;
  duration: number;
  timezone?: string;
  settings?: Record<string, any>;
}

interface MeetingResponse {
  id: string;
  uuid: string;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  status: 'waiting' | 'started' | 'ended';
}

interface Recording {
  id?: string;
  meeting_id: string;
  topic: string;
  start_time: string;
  duration: number;
  files?: Array<{
    id: string;
    type: 'M4A' | 'MP4' | 'VTT' | 'TIMELINE';
    download_url: string;
    file_size: number;
  }>;
}

interface User {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  type?: 1 | 2 | 3; // 1=Basic, 2=Licensed, 3=On-prem
}

interface Webinar {
  id?: string;
  topic: string;
  start_time: Date;
  duration: number;
  settings?: Record<string, any>;
}

class ZoomClient {
  private config: ZoomConfig;
  private axiosInstance: AxiosInstance;
  private baseUrl: string;
  private accessToken: string = '';
  private tokenExpiry: number = 0;
  private rateLimitQueue: number[] = [];

  constructor(config: ZoomConfig) {
    this.config = {
      timeout: 30000,
      rateLimit: 10,
      authType: 'jwt',
      subdomain: 'zoom.us',
      ...config,
    };

    this.baseUrl = `https://api.${this.config.subdomain}/v2`;

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth
    this.axiosInstance.interceptors.request.use((config) => {
      const token = this.getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  private getAuthToken(): string {
    if (this.config.authType === 'jwt') {
      return this.generateJWT();
    }
    return this.accessToken;
  }

  private generateJWT(): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.config.clientId,
      exp: now + 3600, // 1 hour expiry
    };

    return jwt.sign(payload, this.config.clientSecret, { algorithm: 'HS256' });
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    this.rateLimitQueue = this.rateLimitQueue.filter((t) => now - t < 1000);

    if (this.rateLimitQueue.length >= this.config.rateLimit!) {
      const oldestRequest = this.rateLimitQueue[0];
      const waitTime = 1000 - (now - oldestRequest);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.rateLimitQueue.push(now);
  }

  async detectAccountTier(): Promise<AccountInfo> {
    try {
      const info = await this.getAccountInfo();

      let tier: 'free' | 'pro' | 'business' | 'enterprise' = 'free';
      const features: string[] = [];

      features.push('basic_meetings');
      features.push('screen_sharing');
      features.push('cloud_recording');

      // Detect tier based on account info
      if (info.meeting_minutes_used > 0 || info.host_count > 1) {
        tier = 'pro';
        features.push('unlimited_duration');
        features.push('webinars');
        features.push('breakout_rooms');
        features.push('recording_transcription');
      }

      if (info.max_participants >= 300) {
        tier = 'business';
        features.push('sso');
        features.push('team_collaboration');
        features.push('advanced_reporting');
        features.push('dedicated_support');
      }

      if (info.max_participants >= 500 || info.account_type === 'enterprise') {
        tier = 'enterprise';
        features.push('unlimited_participants');
        features.push('custom_branding');
        features.push('white_label');
      }

      return {
        tier,
        hasApiAccess: true,
        accountId: info.account_id || '',
        accountName: info.account_name || '',
        hostCount: info.host_count || 1,
        meetingMinutesUsed: info.meeting_minutes_used || 0,
        maxParticipants: info.max_participants || 100,
        storageGB: info.storage_gb || 5,
        features,
        setupInstructions: this.getSetupInstructions(),
        upgradeRequired: tier === 'free',
      };
    } catch (error) {
      return {
        tier: 'free',
        hasApiAccess: false,
        accountId: '',
        accountName: '',
        hostCount: 0,
        meetingMinutesUsed: 0,
        maxParticipants: 0,
        storageGB: 0,
        features: [],
        setupInstructions: this.getSetupInstructions(),
        upgradeRequired: true,
      };
    }
  }

  async getAccountInfo(): Promise<any> {
    try {
      await this.checkRateLimit();
      const response = await this.axiosInstance.get('/accounts/me');
      return response.data;
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async verifyApiKey(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/users/me');
      return !!response.data.id;
    } catch {
      return false;
    }
  }

  async createMeeting(meeting: Meeting): Promise<MeetingResponse> {
    await this.checkRateLimit();

    try {
      const userId = 'me'; // or specific user ID

      const payload = {
        topic: meeting.topic,
        type: 1, // Instant
        start_time: meeting.start_time.toISOString(),
        duration: meeting.duration,
        timezone: meeting.timezone || 'UTC',
        settings: meeting.settings || {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: false,
          waiting_room: false,
        },
      };

      const response = await this.axiosInstance.post(`/users/${userId}/meetings`, payload);

      return {
        id: response.data.id,
        uuid: response.data.uuid,
        topic: response.data.topic,
        start_time: response.data.start_time,
        duration: response.data.duration,
        join_url: response.data.join_url,
        status: 'waiting',
      };
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async getMeeting(meetingId: string): Promise<MeetingResponse> {
    await this.checkRateLimit();

    try {
      const response = await this.axiosInstance.get(`/meetings/${meetingId}`);

      return {
        id: response.data.id,
        uuid: response.data.uuid,
        topic: response.data.topic,
        start_time: response.data.start_time,
        duration: response.data.duration,
        join_url: response.data.join_url,
        status: response.data.status || 'waiting',
      };
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async listMeetings(): Promise<MeetingResponse[]> {
    await this.checkRateLimit();

    try {
      const response = await this.axiosInstance.get('/users/me/meetings');

      return response.data.meetings.map((m: any) => ({
        id: m.id,
        uuid: m.uuid,
        topic: m.topic,
        start_time: m.start_time,
        duration: m.duration,
        join_url: m.join_url,
        status: m.status || 'waiting',
      }));
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async deleteMeeting(meetingId: string): Promise<boolean> {
    await this.checkRateLimit();

    try {
      await this.axiosInstance.delete(`/meetings/${meetingId}`);
      return true;
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async listRecordings(): Promise<Recording[]> {
    await this.checkRateLimit();

    try {
      const response = await this.axiosInstance.get('/users/me/recordings');

      return response.data.recordings.map((r: any) => ({
        id: r.id,
        meeting_id: r.meeting_id,
        topic: r.topic,
        start_time: r.start_time,
        duration: r.duration,
        files: r.recording_files,
      }));
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async getRecording(recordingId: string): Promise<Recording> {
    await this.checkRateLimit();

    try {
      const response = await this.axiosInstance.get(`/recordings/${recordingId}`);

      return {
        id: response.data.id,
        meeting_id: response.data.meeting_id,
        topic: response.data.topic,
        start_time: response.data.start_time,
        duration: response.data.duration,
        files: response.data.recording_files,
      };
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async deleteRecording(recordingId: string): Promise<boolean> {
    await this.checkRateLimit();

    try {
      await this.axiosInstance.delete(`/recordings/${recordingId}`);
      return true;
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async listUsers(): Promise<User[]> {
    await this.checkRateLimit();

    try {
      const response = await this.axiosInstance.get('/users');

      return response.data.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        type: u.type,
      }));
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async getUser(userId: string): Promise<User> {
    await this.checkRateLimit();

    try {
      const response = await this.axiosInstance.get(`/users/${userId}`);

      return {
        id: response.data.id,
        email: response.data.email,
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        type: response.data.type,
      };
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async createUser(user: User): Promise<User> {
    await this.checkRateLimit();

    try {
      const payload = {
        action: 'create',
        user_info: {
          email: user.email,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          type: user.type || 1,
        },
      };

      const response = await this.axiosInstance.post('/users', payload);

      return {
        id: response.data.id,
        email: response.data.email,
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        type: response.data.type,
      };
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async createWebinar(webinar: Webinar): Promise<any> {
    await this.checkRateLimit();

    try {
      const payload = {
        topic: webinar.topic,
        type: 5, // Webinar
        start_time: webinar.start_time.toISOString(),
        duration: webinar.duration,
        settings: webinar.settings || {
          host_video: true,
          participant_video: false,
          registrants_confirmation_email: true,
        },
      };

      const response = await this.axiosInstance.post('/users/me/webinars', payload);

      return {
        id: response.data.id,
        uuid: response.data.uuid,
        topic: response.data.topic,
        start_time: response.data.start_time,
        join_url: response.data.join_url,
      };
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async getMeetingReport(meetingId: string): Promise<any> {
    await this.checkRateLimit();

    try {
      const response = await this.axiosInstance.get(`/report/meetings/${meetingId}/participants`);

      return response.data;
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  private getSetupInstructions(): string {
    return `
Zoom API Setup Instructions

1. Create Zoom App:
   - Visit: https://marketplace.zoom.us/
   - Click "Develop" → "Build App"
   - Choose JWT or OAuth
   - Enter app details

2. Get Your Credentials:
   - Client ID: From App Dashboard
   - Client Secret: From App Dashboard
   - Account ID: From Account Settings

3. Enable API Scopes:
   - Go to "Scopes" section
   - Add: meeting:create, meeting:read, meeting:update
   - Add: recording:read, webinar:read
   - Click "Save"

4. Configure Environment:
   - Set ZOOM_CLIENT_ID=${your_client_id}
   - Set ZOOM_CLIENT_SECRET=${your_client_secret}
   - Set ZOOM_ACCOUNT_ID=${your_account_id}

5. Verify Setup:
   - Run: npm run detect
   - Run: npm run auth -- verify

For more info: https://developers.zoom.us/docs/api/rest/authentication/
    `;
  }

  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.data) {
        return JSON.stringify(axiosError.response.data);
      }
      return axiosError.message;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }
}

function createZoomClient(): ZoomClient {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing required environment variables: ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET'
    );
  }

  return new ZoomClient({
    clientId,
    clientSecret,
    accountId: process.env.ZOOM_ACCOUNT_ID,
    timeout: parseInt(process.env.ZOOM_TIMEOUT || '30000'),
    rateLimit: parseInt(process.env.ZOOM_RATE_LIMIT || '10'),
    authType: (process.env.ZOOM_AUTH_TYPE || 'jwt') as 'jwt' | 'oauth',
    subdomain: process.env.ZOOM_SUBDOMAIN || 'zoom.us',
  });
}

export {
  ZoomClient,
  createZoomClient,
  AccountInfo,
  Meeting,
  MeetingResponse,
  Recording,
  User,
  Webinar,
  ZoomConfig,
};
