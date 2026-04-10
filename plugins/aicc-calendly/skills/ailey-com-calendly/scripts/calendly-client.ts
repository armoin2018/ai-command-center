import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import open from 'open';
import { CalendlyConfig, CalendlyTier, getAuthMethod, getTierCapabilities, checkFeatureAvailability } from './config.js';

export class CalendlyClient {
  private axios: AxiosInstance;
  private config: CalendlyConfig;
  private detectedTier?: CalendlyTier;

  constructor(config: CalendlyConfig) {
    this.config = config;
    
    const authMethod = getAuthMethod(config);
    if (authMethod === 'none') {
      throw new Error('No authentication configured. Set CALENDLY_ACCESS_TOKEN or OAuth credentials.');
    }

    this.axios = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(config.accessToken && { 'Authorization': `Bearer ${config.accessToken}` }),
      },
    });

    // Add request interceptor for OAuth token injection
    this.axios.interceptors.request.use((requestConfig) => {
      if (!requestConfig.headers['Authorization'] && this.config.accessToken) {
        requestConfig.headers['Authorization'] = `Bearer ${this.config.accessToken}`;
      }
      return requestConfig;
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const { status, data } = error.response;
          const tier = this.detectedTier || this.config.tier;
          
          if (status === 403 && tier) {
            const message = data.message || data.error || 'Access forbidden';
            throw new Error(`${message}\n\nThis feature may require a higher subscription tier. Current tier: ${tier}`);
          }
          
          if (status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            throw new Error(`Rate limit exceeded. Retry after ${retryAfter || 'some time'}.`);
          }
          
          throw new Error(`API Error ${status}: ${data.message || data.error || 'Unknown error'}`);
        }
        throw error;
      }
    );
  }

  // OAuth flow
  async initiateOAuth(): Promise<string> {
    const { authUrl, clientId, redirectUri } = this.config;
    const authorizationUrl = `${authUrl}/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri!)}`;
    
    console.log('Opening browser for OAuth authorization...');
    await open(authorizationUrl);
    
    return authorizationUrl;
  }

  async exchangeCodeForToken(code: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const { authUrl, clientId, clientSecret, redirectUri } = this.config;
    
    const response = await axios.post(`${authUrl}/oauth/token`, {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    this.config.accessToken = response.data.access_token;
    this.axios.defaults.headers['Authorization'] = `Bearer ${response.data.access_token}`;
    
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const { authUrl, clientId, clientSecret } = this.config;
    
    const response = await axios.post(`${authUrl}/oauth/token`, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    this.config.accessToken = response.data.access_token;
    this.axios.defaults.headers['Authorization'] = `Bearer ${response.data.access_token}`;
    
    return response.data;
  }

  // Tier detection
  async detectTier(): Promise<CalendlyTier> {
    if (this.detectedTier) {
      return this.detectedTier;
    }

    if (this.config.tier) {
      this.detectedTier = this.config.tier;
      return this.detectedTier;
    }

    try {
      // Get current user to determine organization
      const user = await this.getCurrentUser();
      const orgUri = user.resource.current_organization;
      
      // Try to access organization details
      const org = await this.get(orgUri);
      
      // Attempt to detect tier based on available features
      // Try webhooks endpoint (Premium+)
      try {
        await this.get('/webhook_subscriptions', { count: 1 });
        // If webhooks work, at least Professional tier
        this.detectedTier = 'professional';
      } catch {
        // Webhooks not available, Essentials or Basic
        this.detectedTier = 'essentials';
      }
      
      // Try team features (Teams+)
      if (org.resource.memberships_count > 1) {
        this.detectedTier = 'teams';
      }
      
      console.log(`Detected tier: ${this.detectedTier}`);
      return this.detectedTier;
    } catch (error) {
      console.warn('Could not detect tier, defaulting to basic');
      this.detectedTier = 'basic';
      return this.detectedTier;
    }
  }

  checkFeature(feature: string): void {
    const tier = this.detectedTier || this.config.tier || 'basic';
    const capabilities = getTierCapabilities(tier);
    
    if (feature in capabilities && !capabilities[feature as keyof typeof capabilities]) {
      throw new Error(`Feature "${feature}" is not available in ${tier} tier. Upgrade required.`);
    }
  }

  // HTTP methods
  async get<T = any>(path: string, params?: any): Promise<AxiosResponse<T>> {
    return this.axios.get(path, { params });
  }

  async post<T = any>(path: string, data?: any): Promise<AxiosResponse<T>> {
    return this.axios.post(path, data);
  }

  async put<T = any>(path: string, data?: any): Promise<AxiosResponse<T>> {
    return this.axios.put(path, data);
  }

  async delete<T = any>(path: string): Promise<AxiosResponse<T>> {
    return this.axios.delete(path);
  }

  // User operations
  async getCurrentUser(): Promise<any> {
    const response = await this.get('/users/me');
    this.config.userUri = response.data.resource.uri;
    return response.data;
  }

  async getUser(userUri: string): Promise<any> {
    const response = await this.get(userUri);
    return response.data;
  }

  // Event types
  async listEventTypes(userUri?: string, params?: any): Promise<any> {
    const uri = userUri || this.config.userUri;
    if (!uri) {
      const user = await this.getCurrentUser();
      return this.listEventTypes(user.resource.uri, params);
    }
    const response = await this.get('/event_types', { user: uri, ...params });
    return response.data;
  }

  async getEventType(uuid: string): Promise<any> {
    const response = await this.get(`/event_types/${uuid}`);
    return response.data;
  }

  async createEventType(data: any): Promise<any> {
    const response = await this.post('/event_types', data);
    return response.data;
  }

  async updateEventType(uuid: string, data: any): Promise<any> {
    const response = await this.put(`/event_types/${uuid}`, data);
    return response.data;
  }

  async deleteEventType(uuid: string): Promise<void> {
    await this.delete(`/event_types/${uuid}`);
  }

  // Scheduled events
  async listScheduledEvents(params?: any): Promise<any> {
    const response = await this.get('/scheduled_events', params);
    return response.data;
  }

  async getScheduledEvent(uuid: string): Promise<any> {
    const response = await this.get(`/scheduled_events/${uuid}`);
    return response.data;
  }

  async cancelScheduledEvent(uuid: string, reason?: string): Promise<any> {
    const response = await this.post(`/scheduled_events/${uuid}/cancellation`, { reason });
    return response.data;
  }

  async listEventInvitees(eventUuid: string, params?: any): Promise<any> {
    const response = await this.get(`/scheduled_events/${eventUuid}/invitees`, params);
    return response.data;
  }

  async getInvitee(inviteeUuid: string): Promise<any> {
    const response = await this.get(`/scheduled_event_invitees/${inviteeUuid}`);
    return response.data;
  }

  // Availability
  async getUserAvailability(userUri?: string, params?: any): Promise<any> {
    const uri = userUri || this.config.userUri;
    if (!uri) {
      await this.getCurrentUser();
    }
    const response = await this.get('/user_availability_schedules', { user: uri, ...params });
    return response.data;
  }

  // Organization
  async listOrganizationMemberships(orgUri: string, params?: any): Promise<any> {
    const response = await this.get('/organization_memberships', { organization: orgUri, ...params });
    return response.data;
  }

  async getOrganizationMembership(uuid: string): Promise<any> {
    const response = await this.get(`/organization_memberships/${uuid}`);
    return response.data;
  }

  async removeOrganizationMembership(uuid: string): Promise<void> {
    await this.delete(`/organization_memberships/${uuid}`);
  }

  // Webhooks
  async listWebhookSubscriptions(orgUri: string, params?: any): Promise<any> {
    this.checkFeature('webhooks');
    const response = await this.get('/webhook_subscriptions', { organization: orgUri, ...params });
    return response.data;
  }

  async getWebhookSubscription(uuid: string): Promise<any> {
    this.checkFeature('webhooks');
    const response = await this.get(`/webhook_subscriptions/${uuid}`);
    return response.data;
  }

  async createWebhookSubscription(data: any): Promise<any> {
    this.checkFeature('webhooks');
    const response = await this.post('/webhook_subscriptions', data);
    return response.data;
  }

  async deleteWebhookSubscription(uuid: string): Promise<void> {
    this.checkFeature('webhooks');
    await this.delete(`/webhook_subscriptions/${uuid}`);
  }

  // Routing forms (Professional+)
  async listRoutingForms(orgUri: string, params?: any): Promise<any> {
    this.checkFeature('routing');
    const response = await this.get('/routing_forms', { organization: orgUri, ...params });
    return response.data;
  }

  async getRoutingForm(uuid: string): Promise<any> {
    this.checkFeature('routing');
    const response = await this.get(`/routing_forms/${uuid}`);
    return response.data;
  }

  async listRoutingFormSubmissions(formUuid: string, params?: any): Promise<any> {
    this.checkFeature('routing');
    const response = await this.get(`/routing_forms/${formUuid}/submissions`, params);
    return response.data;
  }

  // Analytics (Essentials+)
  async getActivityLogEntries(orgUri: string, params?: any): Promise<any> {
    this.checkFeature('analytics');
    const response = await this.get('/activity_log_entries', { organization: orgUri, ...params });
    return response.data;
  }
}

export default CalendlyClient;
