import axios, { AxiosInstance, AxiosResponse } from 'axios';
import open from 'open';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { CanvaConfig, CanvaTier, getTierCapabilities, checkFeatureAvailability } from './config.js';

export class CanvaClient {
  private axios: AxiosInstance;
  private config: CanvaConfig;
  private detectedTier?: CanvaTier;

  constructor(config: CanvaConfig) {
    this.config = config;
    
    if (!config.accessToken && (!config.clientId || !config.clientSecret)) {
      throw new Error('No authentication configured. Set CANVA_ACCESS_TOKEN or OAuth credentials.');
    }

    this.axios = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(config.accessToken && { 'Authorization': `Bearer ${config.accessToken}` }),
      },
    });

    // Response interceptor for error handling
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
  async initiateOAuth(scope: string[] = ['design:content:read', 'design:content:write', 'asset:read', 'asset:write']): Promise<string> {
    const { authUrl, clientId, redirectUri } = this.config;
    const scopes = scope.join(' ');
    const authorizationUrl = `${authUrl}/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri!)}&scope=${encodeURIComponent(scopes)}`;
    
    console.log('Opening browser for OAuth authorization...');
    await open(authorizationUrl);
    
    return authorizationUrl;
  }

  async exchangeCodeForToken(code: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const { authUrl, clientId, clientSecret, redirectUri } = this.config;
    
    const response = await axios.post(`${authUrl}/token`, {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    this.config.accessToken = response.data.access_token;
    this.config.refreshToken = response.data.refresh_token;
    this.axios.defaults.headers['Authorization'] = `Bearer ${response.data.access_token}`;
    
    return response.data;
  }

  async refreshAccessToken(): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const { authUrl, clientId, clientSecret, refreshToken } = this.config;
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await axios.post(`${authUrl}/token`, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    this.config.accessToken = response.data.access_token;
    this.config.refreshToken = response.data.refresh_token;
    this.axios.defaults.headers['Authorization'] = `Bearer ${response.data.access_token}`;
    
    return response.data;
  }

  // Tier detection
  async detectTier(): Promise<CanvaTier> {
    if (this.detectedTier) {
      return this.detectedTier;
    }

    if (this.config.tier) {
      this.detectedTier = this.config.tier;
      return this.detectedTier;
    }

    try {
      // Try to access brand kit (Pro+ feature)
      try {
        await this.getBrandTemplates();
        this.detectedTier = 'pro';
      } catch {
        this.detectedTier = 'free';
        return this.detectedTier;
      }

      // Check for team features
      try {
        const user = await this.getCurrentUser();
        if (user.team_id) {
          this.detectedTier = 'teams';
        }
      } catch {
        // Stay at pro
      }

      console.log(`Detected tier: ${this.detectedTier}`);
      return this.detectedTier;
    } catch (error) {
      console.warn('Could not detect tier, defaulting to free');
      this.detectedTier = 'free';
      return this.detectedTier;
    }
  }

  checkFeature(feature: string): void {
    const tier = this.detectedTier || this.config.tier || 'free';
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

  async patch<T = any>(path: string, data?: any): Promise<AxiosResponse<T>> {
    return this.axios.patch(path, data);
  }

  async delete<T = any>(path: string): Promise<AxiosResponse<T>> {
    return this.axios.delete(path);
  }

  // User operations
  async getCurrentUser(): Promise<any> {
    const response = await this.get('/users/me');
    return response.data;
  }

  // Design operations
  async listDesigns(params?: { query?: string; ownership?: string; continuation?: string; limit?: number }): Promise<any> {
    const response = await this.get('/designs', params);
    return response.data;
  }

  async getDesign(designId: string): Promise<any> {
    const response = await this.get(`/designs/${designId}`);
    return response.data;
  }

  async createDesign(data: { design_type: string; title?: string; asset_id?: string }): Promise<any> {
    const response = await this.post('/designs', data);
    return response.data;
  }

  async deleteDesign(designId: string): Promise<void> {
    await this.delete(`/designs/${designId}`);
  }

  // Asset operations
  async listAssets(params?: { query?: string; asset_type?: string; continuation?: string; limit?: number }): Promise<any> {
    const response = await this.get('/assets', params);
    return response.data;
  }

  async getAsset(assetId: string): Promise<any> {
    const response = await this.get(`/assets/${assetId}`);
    return response.data;
  }

  async uploadAsset(filePath: string, assetType: 'IMAGE' | 'VIDEO' | 'AUDIO'): Promise<any> {
    // Step 1: Create upload job
    const uploadJob = await this.post('/assets/uploads', { asset_type: assetType });
    const { upload_url, asset_id } = uploadJob.data;

    // Step 2: Upload file
    const formData = new FormData();
    formData.append('file', createReadStream(filePath));
    
    await axios.post(upload_url, formData, {
      headers: formData.getHeaders(),
    });

    // Step 3: Return asset info
    return { asset_id, upload_url };
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.delete(`/assets/${assetId}`);
  }

  // Folder operations
  async listFolders(params?: { continuation?: string; limit?: number }): Promise<any> {
    const response = await this.get('/folders', params);
    return response.data;
  }

  async createFolder(name: string): Promise<any> {
    const response = await this.post('/folders', { name });
    return response.data;
  }

  async deleteFolder(folderId: string): Promise<void> {
    await this.delete(`/folders/${folderId}`);
  }

  async moveTo Folder(itemId: string, folderId: string, itemType: 'design' | 'asset'): Promise<any> {
    const response = await this.post(`/folders/${folderId}/items`, {
      item_id: itemId,
      item_type: itemType,
    });
    return response.data;
  }

  // Export operations
  async exportDesign(designId: string, format: 'PNG' | 'JPG' | 'PDF' | 'MP4' | 'GIF' | 'PPTX', params?: any): Promise<any> {
    const response = await this.post(`/designs/${designId}/export`, {
      format,
      ...params,
    });
    return response.data;
  }

  async getExportJob(jobId: string): Promise<any> {
    const response = await this.get(`/exports/${jobId}`);
    return response.data;
  }

  // Brand kit operations (Pro+ tier)
  async getBrandTemplates(): Promise<any> {
    this.checkFeature('brandKit');
    const response = await this.get('/brand-templates');
    return response.data;
  }

  async getBrandColors(): Promise<any> {
    this.checkFeature('brandKit');
    const response = await this.get('/brand/colors');
    return response.data;
  }

  async getBrandFonts(): Promise<any> {
    this.checkFeature('brandKit');
    const response = await this.get('/brand/fonts');
    return response.data;
  }

  async getBrandLogos(): Promise<any> {
    this.checkFeature('brandKit');
    const response = await this.get('/brand/logos');
    return response.data;
  }

  // Autofill operations
  async createAutofill(designId: string, data: any): Promise<any> {
    const response = await this.post(`/designs/${designId}/autofill`, { data });
    return response.data;
  }

  async getAutofillJob(jobId: string): Promise<any> {
    const response = await this.get(`/autofills/${jobId}`);
    return response.data;
  }

  // Comments operations
  async listComments(designId: string): Promise<any> {
    const response = await this.get(`/designs/${designId}/comments`);
    return response.data;
  }

  async createComment(designId: string, message: string, replyToId?: string): Promise<any> {
    const response = await this.post(`/designs/${designId}/comments`, {
      message,
      reply_to_id: replyToId,
    });
    return response.data;
  }

  async deleteComment(designId: string, commentId: string): Promise<void> {
    await this.delete(`/designs/${designId}/comments/${commentId}`);
  }
}

export default CanvaClient;
