/**
 * SharePoint Online API Client
 *
 * Microsoft Graph API client for SharePoint operations with rate limiting,
 * retry logic, and structured error handling.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../logger';
import { ExternalError } from '../../errors/customErrors';
import {
    SharePointConfig,
    SharePointSite,
    SharePointList,
    SharePointListItem,
    SharePointDriveItem
} from './types';

interface RateLimiter {
    tokens: number;
    lastRefill: number;
    maxTokens: number;
    refillRate: number; // tokens per second
}

export class SharePointClient {
    private static instance: SharePointClient;
    private axiosInstance: AxiosInstance;
    private rateLimiter: RateLimiter;
    private config: SharePointConfig;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY_MS = 1000;
    private readonly RATE_LIMIT = 120; // requests per minute

    private constructor(config: SharePointConfig) {
        this.config = config;

        this.rateLimiter = {
            tokens: this.RATE_LIMIT,
            lastRefill: Date.now(),
            maxTokens: this.RATE_LIMIT,
            refillRate: this.RATE_LIMIT / 60
        };

        this.axiosInstance = axios.create({
            baseURL: 'https://graph.microsoft.com/v1.0',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        this.setupInterceptors();

        logger.info('SharePointClient initialized', {
            component: 'SharePointClient',
            tenantId: config.tenantId
        });
    }

    /**
     * Get singleton instance of SharePointClient
     * @param config - SharePoint configuration (required on first call)
     */
    public static getInstance(config?: SharePointConfig): SharePointClient {
        if (!SharePointClient.instance && config) {
            SharePointClient.instance = new SharePointClient(config);
        } else if (!SharePointClient.instance) {
            throw new Error('SharePointClient not initialized. Provide config on first call.');
        }
        return SharePointClient.instance;
    }

    /** Reset singleton instance (for testing) */
    public static resetInstance(): void {
        SharePointClient.instance = null as any;
    }

    // ========================================================================
    // Auth
    // ========================================================================

    /**
     * Acquire an OAuth2 access token via client credentials flow
     */
    private async acquireAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;

            const params = new URLSearchParams();
            params.append('client_id', this.config.clientId);
            // Client secret is expected to be provided via SecretStorage at config time
            params.append('client_secret', (this.config as any).clientSecret || '');
            params.append('scope', 'https://graph.microsoft.com/.default');
            params.append('grant_type', 'client_credentials');

            const response = await axios.post(tokenUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

            logger.info('SharePoint OAuth token acquired', { component: 'SharePointClient' });
            return this.accessToken!;
        } catch (error: any) {
            logger.error('Failed to acquire SharePoint OAuth token', {
                component: 'SharePointClient',
                error: error.message
            });
            throw new ExternalError('Failed to acquire OAuth token', 'SharePoint', 401);
        }
    }

    // ========================================================================
    // Interceptors & Error Handling
    // ========================================================================

    private setupInterceptors(): void {
        this.axiosInstance.interceptors.request.use(
            async (requestConfig) => {
                await this.acquireRateLimitToken();
                const token = await this.acquireAccessToken();
                requestConfig.headers.Authorization = `Bearer ${token}`;

                logger.debug('SharePoint API request', {
                    component: 'SharePointClient',
                    method: requestConfig.method,
                    url: requestConfig.url
                });

                return requestConfig;
            },
            (error) => {
                logger.error('Request interceptor error', {
                    component: 'SharePointClient',
                    error: error.message
                });
                return Promise.reject(error);
            }
        );

        this.axiosInstance.interceptors.response.use(
            (response) => {
                logger.debug('SharePoint API response', {
                    component: 'SharePointClient',
                    status: response.status,
                    url: response.config.url
                });
                return response;
            },
            (error: AxiosError) => {
                return this.handleError(error);
            }
        );
    }

    // ========================================================================
    // Rate Limiting
    // ========================================================================

    private async acquireRateLimitToken(): Promise<void> {
        const now = Date.now();
        const timeSinceRefill = (now - this.rateLimiter.lastRefill) / 1000;
        const tokensToAdd = timeSinceRefill * this.rateLimiter.refillRate;

        this.rateLimiter.tokens = Math.min(
            this.rateLimiter.maxTokens,
            this.rateLimiter.tokens + tokensToAdd
        );
        this.rateLimiter.lastRefill = now;

        if (this.rateLimiter.tokens < 1) {
            const waitTime = (1 - this.rateLimiter.tokens) / this.rateLimiter.refillRate * 1000;
            logger.debug('Rate limit wait', {
                component: 'SharePointClient',
                waitTime: `${Math.round(waitTime)}ms`
            });
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.rateLimiter.tokens = 1;
        }

        this.rateLimiter.tokens -= 1;
    }

    // ========================================================================
    // Retry Logic
    // ========================================================================

    private async retryRequest<T>(
        request: () => Promise<T>,
        attempt: number = 1
    ): Promise<T> {
        try {
            return await request();
        } catch (error: any) {
            if (attempt >= this.MAX_RETRIES) {
                throw error;
            }
            if (error.response?.status === 429 || error.response?.status >= 500) {
                const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                logger.info('Retrying SharePoint request', {
                    component: 'SharePointClient',
                    attempt,
                    maxRetries: this.MAX_RETRIES,
                    delay: `${delay}ms`
                });
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retryRequest(request, attempt + 1);
            }
            throw error;
        }
    }

    // ========================================================================
    // Error Handling
    // ========================================================================

    private handleError(error: AxiosError): Promise<never> {
        const status = error.response?.status;
        const data: any = error.response?.data;

        let message = 'SharePoint API error';

        if (status === 401) {
            message = 'Authentication failed. Check your tenant ID, client ID, and credentials.';
        } else if (status === 403) {
            message = 'Permission denied. Ensure the app has the required SharePoint Graph permissions.';
        } else if (status === 404) {
            message = 'Resource not found.';
        } else if (status === 429) {
            message = 'Rate limit exceeded. Please try again later.';
        } else if (data?.error?.message) {
            message = data.error.message;
        } else if (error.request && !error.response) {
            message = 'No response from Microsoft Graph. Check your network connection.';
        }

        logger.error('SharePoint API error', {
            component: 'SharePointClient',
            status,
            message,
            url: error.config?.url
        });

        return Promise.reject(new ExternalError(message, 'SharePoint', status));
    }

    // ========================================================================
    // Connection Test
    // ========================================================================

    /**
     * Test connection to Microsoft Graph API for SharePoint
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const response = await this.retryRequest(() =>
                this.axiosInstance.get('/sites/root')
            );

            logger.info('SharePoint connection successful', {
                component: 'SharePointClient',
                site: response.data.displayName
            });

            return {
                success: true,
                message: `Connected to root site: ${response.data.displayName}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Connection failed'
            };
        }
    }

    // ========================================================================
    // Site Operations
    // ========================================================================

    /**
     * Get a SharePoint site by ID
     * @param siteId - The site ID
     */
    async getSite(siteId: string): Promise<SharePointSite> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get(`/sites/${siteId}`)
        );

        logger.info('Retrieved SharePoint site', {
            component: 'SharePointClient',
            siteId,
            displayName: response.data.displayName
        });

        return response.data;
    }

    /**
     * Search for SharePoint sites
     * @param query - Search query string
     */
    async searchSites(query: string): Promise<SharePointSite[]> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get('/sites', {
                params: { $search: `"${query}"` }
            })
        );

        logger.info('Searched SharePoint sites', {
            component: 'SharePointClient',
            query,
            count: response.data.value?.length ?? 0
        });

        return response.data.value || [];
    }

    // ========================================================================
    // List Operations
    // ========================================================================

    /**
     * List all lists in a site
     * @param siteId - The site ID
     */
    async listLists(siteId: string): Promise<SharePointList[]> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get(`/sites/${siteId}/lists`)
        );

        logger.info('Listed SharePoint lists', {
            component: 'SharePointClient',
            siteId,
            count: response.data.value?.length ?? 0
        });

        return response.data.value || [];
    }

    /**
     * Create a new list in a site
     * @param siteId - The site ID
     * @param displayName - List display name
     * @param template - Optional list template (e.g., 'genericList')
     */
    async createList(
        siteId: string,
        displayName: string,
        template?: string
    ): Promise<SharePointList> {
        const payload: Record<string, any> = {
            displayName,
            list: {
                template: template || 'genericList'
            }
        };

        const response = await this.retryRequest(() =>
            this.axiosInstance.post(`/sites/${siteId}/lists`, payload)
        );

        logger.info('Created SharePoint list', {
            component: 'SharePointClient',
            siteId,
            listId: response.data.id,
            displayName
        });

        return response.data;
    }

    // ========================================================================
    // List Item Operations
    // ========================================================================

    /**
     * Get all items in a list
     * @param siteId - The site ID
     * @param listId - The list ID
     */
    async getListItems(siteId: string, listId: string): Promise<SharePointListItem[]> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get(
                `/sites/${siteId}/lists/${listId}/items`,
                { params: { $expand: 'fields' } }
            )
        );

        logger.info('Retrieved SharePoint list items', {
            component: 'SharePointClient',
            siteId,
            listId,
            count: response.data.value?.length ?? 0
        });

        return response.data.value || [];
    }

    /**
     * Create a new item in a list
     * @param siteId - The site ID
     * @param listId - The list ID
     * @param fields - Field values for the new item
     */
    async createListItem(
        siteId: string,
        listId: string,
        fields: Record<string, any>
    ): Promise<SharePointListItem> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.post(
                `/sites/${siteId}/lists/${listId}/items`,
                { fields }
            )
        );

        logger.info('Created SharePoint list item', {
            component: 'SharePointClient',
            siteId,
            listId,
            itemId: response.data.id
        });

        return response.data;
    }

    /**
     * Update an existing list item
     * @param siteId - The site ID
     * @param listId - The list ID
     * @param itemId - The item ID
     * @param fields - Field values to update
     */
    async updateListItem(
        siteId: string,
        listId: string,
        itemId: string,
        fields: Record<string, any>
    ): Promise<SharePointListItem> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.patch(
                `/sites/${siteId}/lists/${listId}/items/${itemId}/fields`,
                fields
            )
        );

        logger.info('Updated SharePoint list item', {
            component: 'SharePointClient',
            siteId,
            listId,
            itemId
        });

        // Return a reconstructed item shape
        return {
            id: itemId,
            fields: response.data,
            createdDateTime: response.data.Created || '',
            lastModifiedDateTime: response.data.Modified || new Date().toISOString()
        };
    }

    /**
     * Delete a list item
     * @param siteId - The site ID
     * @param listId - The list ID
     * @param itemId - The item ID
     */
    async deleteListItem(
        siteId: string,
        listId: string,
        itemId: string
    ): Promise<void> {
        await this.retryRequest(() =>
            this.axiosInstance.delete(
                `/sites/${siteId}/lists/${listId}/items/${itemId}`
            )
        );

        logger.info('Deleted SharePoint list item', {
            component: 'SharePointClient',
            siteId,
            listId,
            itemId
        });
    }

    // ========================================================================
    // Drive / Document Library Operations
    // ========================================================================

    /**
     * Upload a file to a document library
     * @param siteId - The site ID
     * @param driveId - The drive (document library) ID
     * @param folderPath - Folder path within the drive (e.g., '/General')
     * @param fileName - Name of the file to upload
     * @param content - File content as a Buffer
     */
    async uploadFile(
        siteId: string,
        driveId: string,
        folderPath: string,
        fileName: string,
        content: Buffer
    ): Promise<SharePointDriveItem> {
        const normalizedPath = folderPath.replace(/^\/+|\/+$/g, '');
        const uploadPath = normalizedPath
            ? `${normalizedPath}/${fileName}`
            : fileName;

        const response = await this.retryRequest(() =>
            this.axiosInstance.put(
                `/sites/${siteId}/drives/${driveId}/root:/${uploadPath}:/content`,
                content,
                {
                    headers: {
                        'Content-Type': 'application/octet-stream'
                    }
                }
            )
        );

        logger.info('Uploaded file to SharePoint', {
            component: 'SharePointClient',
            siteId,
            driveId,
            path: uploadPath,
            itemId: response.data.id
        });

        return response.data;
    }

    /**
     * Download a file from a document library
     * @param siteId - The site ID
     * @param driveId - The drive (document library) ID
     * @param itemId - The drive item ID
     */
    async downloadFile(
        siteId: string,
        driveId: string,
        itemId: string
    ): Promise<Buffer> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get(
                `/sites/${siteId}/drives/${driveId}/items/${itemId}/content`,
                { responseType: 'arraybuffer' }
            )
        );

        logger.info('Downloaded file from SharePoint', {
            component: 'SharePointClient',
            siteId,
            driveId,
            itemId
        });

        return Buffer.from(response.data);
    }

    /**
     * List items in a drive folder
     * @param siteId - The site ID
     * @param driveId - The drive (document library) ID
     * @param folderPath - Optional folder path (defaults to root)
     */
    async listDriveItems(
        siteId: string,
        driveId: string,
        folderPath?: string
    ): Promise<SharePointDriveItem[]> {
        const basePath = `/sites/${siteId}/drives/${driveId}`;
        const url = folderPath
            ? `${basePath}/root:/${folderPath.replace(/^\/+|\/+$/g, '')}:/children`
            : `${basePath}/root/children`;

        const response = await this.retryRequest(() =>
            this.axiosInstance.get(url)
        );

        logger.info('Listed SharePoint drive items', {
            component: 'SharePointClient',
            siteId,
            driveId,
            folderPath: folderPath || '/',
            count: response.data.value?.length ?? 0
        });

        return response.data.value || [];
    }
}
