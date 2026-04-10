import axios, { AxiosInstance } from 'axios';
import { createHmac } from 'crypto';
import { TwilioConfig, TwilioTier, getAuthMethod, getTierCapabilities, TierCapabilities } from './config.js';

export class TwilioClient {
  private axios: AxiosInstance;
  private config: TwilioConfig;
  private detectedTier?: TwilioTier;

  constructor(config: TwilioConfig) {
    this.config = config;

    const authMethod = getAuthMethod(config);
    if (authMethod === 'none') {
      throw new Error('No authentication configured. Set API Key credentials or Auth Token.');
    }

    const username = authMethod === 'api-key' ? config.apiKey! : config.accountSid;
    const password = authMethod === 'api-key' ? config.apiSecret! : config.authToken!;

    this.axios = axios.create({
      baseURL: `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`,
      auth: { username, password },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const { status, data } = error.response;
          if (status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            throw new Error(`Rate limit exceeded. Retry after ${retryAfter || 'some time'} seconds.`);
          }
          const msg = data?.message || data?.error_message || JSON.stringify(data);
          throw new Error(`Twilio API Error ${status}: ${msg}`);
        }
        throw error;
      }
    );
  }

  // ── Form encoding helper ───────────────────────────────────────────

  private toForm(data: Record<string, any>): URLSearchParams {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, String(v)));
      } else {
        params.append(key, String(value));
      }
    }
    return params;
  }

  // ── Tier Detection ─────────────────────────────────────────────────

  async detectTier(): Promise<TwilioTier> {
    if (this.detectedTier) return this.detectedTier;
    if (this.config.tier) {
      this.detectedTier = this.config.tier;
      return this.detectedTier;
    }

    try {
      const account = await this.getAccount();
      if (account.type === 'Trial') {
        this.detectedTier = 'free-trial';
      } else if (account.type === 'Full') {
        // Check for production indicators
        try {
          const numbers = await this.listPhoneNumbers({ limit: 1 });
          this.detectedTier = numbers.length > 0 ? 'pay-as-you-go' : 'pay-as-you-go';
        } catch {
          this.detectedTier = 'pay-as-you-go';
        }
      } else {
        this.detectedTier = 'pay-as-you-go';
      }

      console.log(`Detected tier: ${this.detectedTier}`);
      return this.detectedTier;
    } catch {
      this.detectedTier = 'pay-as-you-go';
      return this.detectedTier;
    }
  }

  checkFeature(feature: keyof TierCapabilities): void {
    const tier = this.detectedTier || this.config.tier || 'pay-as-you-go';
    const caps = getTierCapabilities(tier);
    if (!caps[feature]) {
      throw new Error(`Feature "${feature}" is not available in ${tier} tier. Upgrade required.`);
    }
  }

  // ── Account ────────────────────────────────────────────────────────

  async getAccount(): Promise<any> {
    const response = await this.axios.get('.json');
    return response.data;
  }

  // ── Messaging ──────────────────────────────────────────────────────

  async sendMessage(params: {
    to: string;
    from?: string;
    body?: string;
    mediaUrl?: string[];
    messagingServiceSid?: string;
    statusCallback?: string;
  }): Promise<any> {
    const data: Record<string, any> = {
      To: params.to,
      From: params.from || this.config.fromNumber,
      Body: params.body,
      StatusCallback: params.statusCallback,
    };

    if (params.messagingServiceSid || this.config.messagingServiceSid) {
      data.MessagingServiceSid = params.messagingServiceSid || this.config.messagingServiceSid;
      delete data.From; // MessagingServiceSid handles sender selection
    }

    if (params.mediaUrl) {
      params.mediaUrl.forEach((url, i) => {
        data[`MediaUrl${i}`] = url;
      });
    }

    const response = await this.axios.post('/Messages.json', this.toForm(data));
    return response.data;
  }

  async listMessages(params?: {
    to?: string; from?: string; dateSent?: string;
    limit?: number; pageSize?: number;
  }): Promise<any[]> {
    const queryParams: Record<string, any> = {};
    if (params?.to) queryParams.To = params.to;
    if (params?.from) queryParams.From = params.from;
    if (params?.dateSent) queryParams.DateSent = params.dateSent;
    if (params?.pageSize) queryParams.PageSize = params.pageSize;

    const response = await this.axios.get('/Messages.json', { params: queryParams });
    return response.data.messages;
  }

  async getMessage(messageSid: string): Promise<any> {
    const response = await this.axios.get(`/Messages/${messageSid}.json`);
    return response.data;
  }

  async deleteMessage(messageSid: string): Promise<void> {
    await this.axios.delete(`/Messages/${messageSid}.json`);
  }

  // ── Voice ──────────────────────────────────────────────────────────

  async createCall(params: {
    to: string;
    from?: string;
    twiml?: string;
    url?: string;
    method?: string;
    statusCallback?: string;
    record?: boolean;
    timeout?: number;
  }): Promise<any> {
    const data: Record<string, any> = {
      To: params.to,
      From: params.from || this.config.fromNumber,
      StatusCallback: params.statusCallback,
      Record: params.record,
      Timeout: params.timeout,
    };

    if (params.twiml) {
      data.Twiml = params.twiml;
    } else if (params.url) {
      data.Url = params.url;
      if (params.method) data.Method = params.method;
    }

    const response = await this.axios.post('/Calls.json', this.toForm(data));
    return response.data;
  }

  async listCalls(params?: {
    to?: string; from?: string; status?: string;
    startTime?: string; endTime?: string;
    pageSize?: number;
  }): Promise<any[]> {
    const queryParams: Record<string, any> = {};
    if (params?.to) queryParams.To = params.to;
    if (params?.from) queryParams.From = params.from;
    if (params?.status) queryParams.Status = params.status;
    if (params?.pageSize) queryParams.PageSize = params.pageSize;

    const response = await this.axios.get('/Calls.json', { params: queryParams });
    return response.data.calls;
  }

  async getCall(callSid: string): Promise<any> {
    const response = await this.axios.get(`/Calls/${callSid}.json`);
    return response.data;
  }

  async updateCall(callSid: string, params: { twiml?: string; url?: string; status?: string }): Promise<any> {
    const data: Record<string, any> = {};
    if (params.twiml) data.Twiml = params.twiml;
    if (params.url) data.Url = params.url;
    if (params.status) data.Status = params.status;

    const response = await this.axios.post(`/Calls/${callSid}.json`, this.toForm(data));
    return response.data;
  }

  // ── Phone Numbers ──────────────────────────────────────────────────

  async listPhoneNumbers(params?: { limit?: number }): Promise<any[]> {
    const queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.PageSize = params.limit;

    const response = await this.axios.get('/IncomingPhoneNumbers.json', { params: queryParams });
    return response.data.incoming_phone_numbers;
  }

  async getPhoneNumber(phoneNumberSid: string): Promise<any> {
    const response = await this.axios.get(`/IncomingPhoneNumbers/${phoneNumberSid}.json`);
    return response.data;
  }

  async searchAvailableNumbers(countryCode: string, params?: {
    areaCode?: number;
    contains?: string;
    smsEnabled?: boolean;
    voiceEnabled?: boolean;
    mmsEnabled?: boolean;
    limit?: number;
  }): Promise<any[]> {
    this.checkFeature('phoneNumberPurchase');
    const queryParams: Record<string, any> = {};
    if (params?.areaCode) queryParams.AreaCode = params.areaCode;
    if (params?.contains) queryParams.Contains = params.contains;
    if (params?.smsEnabled !== undefined) queryParams.SmsEnabled = params.smsEnabled;
    if (params?.voiceEnabled !== undefined) queryParams.VoiceEnabled = params.voiceEnabled;
    if (params?.mmsEnabled !== undefined) queryParams.MmsEnabled = params.mmsEnabled;
    if (params?.limit) queryParams.PageSize = params.limit;

    const response = await this.axios.get(
      `/AvailablePhoneNumbers/${countryCode}/Local.json`,
      { params: queryParams }
    );
    return response.data.available_phone_numbers;
  }

  async buyPhoneNumber(phoneNumber: string, params?: {
    smsUrl?: string; voiceUrl?: string; statusCallback?: string;
  }): Promise<any> {
    this.checkFeature('phoneNumberPurchase');
    const data: Record<string, any> = {
      PhoneNumber: phoneNumber,
      SmsUrl: params?.smsUrl,
      VoiceUrl: params?.voiceUrl,
      StatusCallback: params?.statusCallback,
    };

    const response = await this.axios.post('/IncomingPhoneNumbers.json', this.toForm(data));
    return response.data;
  }

  async updatePhoneNumber(phoneNumberSid: string, params: {
    smsUrl?: string; voiceUrl?: string; friendlyName?: string;
  }): Promise<any> {
    const data: Record<string, any> = {};
    if (params.smsUrl) data.SmsUrl = params.smsUrl;
    if (params.voiceUrl) data.VoiceUrl = params.voiceUrl;
    if (params.friendlyName) data.FriendlyName = params.friendlyName;

    const response = await this.axios.post(`/IncomingPhoneNumbers/${phoneNumberSid}.json`, this.toForm(data));
    return response.data;
  }

  async releasePhoneNumber(phoneNumberSid: string): Promise<void> {
    await this.axios.delete(`/IncomingPhoneNumbers/${phoneNumberSid}.json`);
  }

  // ── Verify ─────────────────────────────────────────────────────────

  async requestVerification(to: string, channel: 'sms' | 'call' | 'email' = 'sms', serviceSid?: string): Promise<any> {
    const sid = serviceSid || this.config.verifyServiceSid;
    if (!sid) {
      throw new Error('Verify Service SID required. Set TWILIO_VERIFY_SERVICE_SID or pass serviceSid.');
    }

    const verifyAxios = axios.create({
      baseURL: 'https://verify.twilio.com/v2',
      auth: {
        username: this.config.apiKey || this.config.accountSid,
        password: this.config.apiSecret || this.config.authToken!,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const response = await verifyAxios.post(
      `/Services/${sid}/Verifications`,
      this.toForm({ To: to, Channel: channel })
    );
    return response.data;
  }

  async checkVerification(to: string, code: string, serviceSid?: string): Promise<any> {
    const sid = serviceSid || this.config.verifyServiceSid;
    if (!sid) {
      throw new Error('Verify Service SID required. Set TWILIO_VERIFY_SERVICE_SID or pass serviceSid.');
    }

    const verifyAxios = axios.create({
      baseURL: 'https://verify.twilio.com/v2',
      auth: {
        username: this.config.apiKey || this.config.accountSid,
        password: this.config.apiSecret || this.config.authToken!,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const response = await verifyAxios.post(
      `/Services/${sid}/VerificationCheck`,
      this.toForm({ To: to, Code: code })
    );
    return response.data;
  }

  // ── Recordings ─────────────────────────────────────────────────────

  async listRecordings(callSid?: string, params?: { pageSize?: number }): Promise<any[]> {
    const path = callSid ? `/Calls/${callSid}/Recordings.json` : '/Recordings.json';
    const response = await this.axios.get(path, { params });
    return response.data.recordings;
  }

  async getRecording(recordingSid: string): Promise<any> {
    const response = await this.axios.get(`/Recordings/${recordingSid}.json`);
    return response.data;
  }

  async deleteRecording(recordingSid: string): Promise<void> {
    await this.axios.delete(`/Recordings/${recordingSid}.json`);
  }

  // ── Usage ──────────────────────────────────────────────────────────

  async getUsageRecords(params?: {
    category?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any[]> {
    const queryParams: Record<string, any> = {};
    if (params?.category) queryParams.Category = params.category;
    if (params?.startDate) queryParams.StartDate = params.startDate;
    if (params?.endDate) queryParams.EndDate = params.endDate;

    const response = await this.axios.get('/Usage/Records.json', { params: queryParams });
    return response.data.usage_records;
  }

  async getUsageTriggers(): Promise<any[]> {
    const response = await this.axios.get('/Usage/Triggers.json');
    return response.data.usage_triggers;
  }

  async createUsageTrigger(params: {
    callbackUrl: string;
    triggerValue: string;
    usageCategory: string;
    recurring?: string;
    friendlyName?: string;
  }): Promise<any> {
    const response = await this.axios.post('/Usage/Triggers.json', this.toForm({
      CallbackUrl: params.callbackUrl,
      TriggerValue: params.triggerValue,
      UsageCategory: params.usageCategory,
      Recurring: params.recurring,
      FriendlyName: params.friendlyName,
    }));
    return response.data;
  }

  // ── Webhook Validation ─────────────────────────────────────────────

  static validateRequest(
    authToken: string,
    signature: string,
    url: string,
    params: Record<string, string>
  ): boolean {
    const sortedKeys = Object.keys(params).sort();
    let data = url;
    for (const key of sortedKeys) {
      data += key + params[key];
    }

    const expectedSignature = createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    return signature === expectedSignature;
  }
}

export default TwilioClient;
