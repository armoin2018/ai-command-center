import axios, { AxiosInstance, AxiosError } from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import mime from 'mime-types';

dotenv.config();

export interface LinkedInConfig {
  accessToken: string;
  apiVersion?: string;
}

export interface ShareOptions {
  text?: string;
  url?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  documentUrl?: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  organizationId?: string; // For company page posts
}

export interface ProfileInfo {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  vanityName?: string;
  profilePicture?: any;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  vanityName?: string;
  logoV2?: any;
  followerCount?: number;
}

export class LinkedInClient {
  private client: AxiosInstance;
  private config: LinkedInConfig;

  constructor(config: LinkedInConfig) {
    this.config = config;
    const apiVersion = config.apiVersion || 'v2';
    
    this.client = axios.create({
      baseURL: `https://api.linkedin.com/${apiVersion}`,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401'
      }
    });
  }

  // ============================================================================
  // PROFILE OPERATIONS
  // ============================================================================

  /**
   * Get basic profile information for authenticated user
   * Note: Limited fields available without partnership
   */
  async getProfile(): Promise<ProfileInfo> {
    try {
      const response = await this.client.get('/me', {
        params: {
          projection: '(id,firstName,lastName,profilePicture(displayImage~:playableStreams))'
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get user's vanity name (custom URL)
   */
  async getVanityName(): Promise<string> {
    try {
      const response = await this.client.get('/me', {
        params: {
          projection: '(vanityName)'
        }
      });
      return response.data.vanityName;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ============================================================================
  // CONTENT SHARING (UGC Posts API)
  // ============================================================================

  /**
   * Share text post to LinkedIn
   */
  async shareTextPost(text: string, visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'): Promise<any> {
    try {
      const profile = await this.getProfile();
      const author = `urn:li:person:${profile.id}`;

      const postData = {
        author: author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility
        }
      };

      const response = await this.client.post('/ugcPosts', postData);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Share link/article with text
   */
  async shareLink(options: ShareOptions): Promise<any> {
    try {
      const profile = await this.getProfile();
      const author = options.organizationId 
        ? `urn:li:organization:${options.organizationId}`
        : `urn:li:person:${profile.id}`;

      const postData = {
        author: author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: options.text || ''
            },
            shareMediaCategory: 'ARTICLE',
            media: [
              {
                status: 'READY',
                originalUrl: options.url,
                title: {
                  text: options.title || ''
                },
                description: {
                  text: options.description || ''
                }
              }
            ]
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': options.visibility || 'PUBLIC'
        }
      };

      const response = await this.client.post('/ugcPosts', postData);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Share image post
   */
  async shareImage(imagePath: string, text: string, visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'): Promise<any> {
    try {
      const profile = await this.getProfile();
      const author = `urn:li:person:${profile.id}`;

      // Step 1: Register upload
      const registerResponse = await this.registerImageUpload(author);
      const uploadUrl = registerResponse.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerResponse.value.asset;

      // Step 2: Upload image
      await this.uploadImage(uploadUrl, imagePath);

      // Step 3: Create post with image
      const postData = {
        author: author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text
            },
            shareMediaCategory: 'IMAGE',
            media: [
              {
                status: 'READY',
                media: asset
              }
            ]
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility
        }
      };

      const response = await this.client.post('/ugcPosts', postData);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Register image upload
   */
  private async registerImageUpload(author: string): Promise<any> {
    try {
      const registerData = {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: author,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }
          ]
        }
      };

      const response = await this.client.post('/assets?action=registerUpload', registerData);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Upload image to LinkedIn
   */
  private async uploadImage(uploadUrl: string, imagePath: string): Promise<void> {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const contentType = mime.lookup(imagePath) || 'image/jpeg';

      await axios.put(uploadUrl, imageBuffer, {
        headers: {
          'Content-Type': contentType
        }
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // ============================================================================
  // ORGANIZATION/COMPANY PAGES
  // ============================================================================

  /**
   * Get organizations (company pages) the user can administer
   */
  async getOrganizations(): Promise<OrganizationInfo[]> {
    try {
      const response = await this.client.get('/organizationalEntityAcls', {
        params: {
          q: 'roleAssignee',
          projection: '(elements*(organizationalTarget~(id,localizedName,vanityName,logoV2)))'
        }
      });

      const organizations = response.data.elements
        .filter((acl: any) => acl.role === 'ADMINISTRATOR')
        .map((acl: any) => {
          const org = acl['organizationalTarget~'];
          return {
            id: org.id,
            name: org.localizedName,
            vanityName: org.vanityName,
            logoV2: org.logoV2
          };
        });

      return organizations;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get organization follower count
   */
  async getOrganizationFollowerCount(organizationId: string): Promise<number> {
    try {
      const response = await this.client.get(`/networkSizes/urn:li:organization:${organizationId}`, {
        params: {
          edgeType: 'CompanyFollowedByMember'
        }
      });
      return response.data.firstDegreeSize || 0;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Share post as organization/company page
   */
  async shareAsOrganization(organizationId: string, options: ShareOptions): Promise<any> {
    try {
      const author = `urn:li:organization:${organizationId}`;

      let postData: any = {
        author: author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: options.text || ''
            },
            shareMediaCategory: options.url ? 'ARTICLE' : 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      // Add media if URL provided
      if (options.url) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            originalUrl: options.url,
            title: {
              text: options.title || ''
            },
            description: {
              text: options.description || ''
            }
          }
        ];
      }

      const response = await this.client.post('/ugcPosts', postData);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Test API connection
   */
  async testConnection(): Promise<ProfileInfo> {
    return await this.getProfile();
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as any;

        switch (status) {
          case 401:
            throw new Error('Authentication failed. Access token is invalid or expired.');
          case 403:
            throw new Error('Permission denied. This action requires additional permissions or LinkedIn Partnership.');
          case 404:
            throw new Error('Resource not found.');
          case 429:
            throw new Error('Rate limit exceeded. Please wait before retrying.');
          default:
            throw new Error(`LinkedIn API error (${status}): ${data.message || JSON.stringify(data)}`);
        }
      } else if (axiosError.request) {
        throw new Error('No response from LinkedIn API. Check your internet connection.');
      }
    }
    throw new Error(`Unexpected error: ${error.message}`);
  }
}

/**
 * Load configuration from environment
 */
export function loadConfig(): LinkedInConfig {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('LINKEDIN_ACCESS_TOKEN not set in environment variables. Run "npm run linkedin setup" for instructions.');
  }

  return {
    accessToken,
    apiVersion: process.env.LINKEDIN_API_VERSION || 'v2'
  };
}
