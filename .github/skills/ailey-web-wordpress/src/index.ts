import axios, { AxiosInstance } from 'axios';

export interface WordPressConfig {
  siteType: 'wordpress-com' | 'self-hosted';
  siteUrl?: string;
  clientId?: string;
  clientSecret?: string;
  appUsername?: string;
  appPassword?: string;
  siteId?: string;
  timeout?: number;
}

export interface AccountTier {
  tier: 'Free' | 'Personal' | 'Premium' | 'Business' | 'eCommerce' | 'Self-Hosted' | 'Pro';
  siteType: 'wordpress-com' | 'self-hosted';
  features: string[];
  storage: string;
  apiAccess: boolean;
  customDomain: boolean;
  setupInstructions: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  status: string;
  url: string;
  author: number;
  date: string;
  modified: string;
  featuredImage?: number;
  categories?: number[];
  tags?: string[];
}

export interface Page {
  id: number;
  title: string;
  content: string;
  status: string;
  url: string;
  parent?: number;
  date: string;
}

export interface Media {
  id: number;
  title: string;
  url: string;
  type: string;
  filename: string;
  size: number;
  date: string;
}

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  url: string;
  roles: string[];
}

export interface Comment {
  id: number;
  author: string;
  email: string;
  content: string;
  status: string;
  date: string;
  postId: number;
}

export interface Plugin {
  slug: string;
  name: string;
  version: string;
  description: string;
  active: boolean;
  url: string;
}

export interface Theme {
  slug: string;
  name: string;
  version: string;
  description: string;
  active: boolean;
  screenshot: string;
}

export interface CreatePostOptions {
  title: string;
  content: string;
  excerpt?: string;
  status?: 'publish' | 'draft' | 'pending' | 'private';
  author?: number;
  categories?: number[];
  tags?: string[];
  featuredImage?: number;
  date?: string;
}

export interface CreateUserOptions {
  username: string;
  name: string;
  email: string;
  role?: 'subscriber' | 'contributor' | 'author' | 'editor' | 'administrator';
  url?: string;
}

export interface UploadMediaOptions {
  filePath: string;
  title?: string;
  description?: string;
}

export interface SiteStats {
  posts: number;
  pages: number;
  users: number;
  comments: number;
  views: number;
  visitors: number;
}

export interface PostAnalysis {
  postId: number;
  title: string;
  score: number;
  issues: string[];
  suggestions: string[];
}

export class WordPressClient {
  private siteType: 'wordpress-com' | 'self-hosted';
  private siteUrl?: string;
  private clientId?: string;
  private clientSecret?: string;
  private appUsername?: string;
  private appPassword?: string;
  private siteId?: string;
  private axiosInstance: AxiosInstance;
  private accessToken?: string;
  private accountTier?: AccountTier;

  constructor(config: WordPressConfig) {
    this.siteType = config.siteType;
    this.siteUrl = config.siteUrl;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.appUsername = config.appUsername;
    this.appPassword = config.appPassword;
    this.siteId = config.siteId;

    // Setup axios with appropriate defaults
    if (this.siteType === 'wordpress-com') {
      this.axiosInstance = axios.create({
        baseURL: 'https://public-api.wordpress.com/rest/v1.1',
        timeout: config.timeout || 30000,
        headers: {
          'User-Agent': 'wordpress-ai-ley/1.0.0'
        }
      });
    } else {
      this.axiosInstance = axios.create({
        baseURL: `${this.siteUrl}/wp-json/wp/v2`,
        timeout: config.timeout || 30000,
        auth: {
          username: this.appUsername || '',
          password: this.appPassword || ''
        },
        headers: {
          'User-Agent': 'wordpress-ai-ley/1.0.0'
        }
      });
    }
  }

  /**
   * Detect account tier and features
   */
  async detectAccountTier(): Promise<AccountTier> {
    try {
      let tier: AccountTier;

      if (this.siteType === 'wordpress-com') {
        tier = await this.detectWordPressCOMTier();
      } else {
        tier = await this.detectSelfHostedTier();
      }

      this.accountTier = tier;
      return tier;
    } catch (error) {
      throw new Error(`Failed to detect account tier: ${error}`);
    }
  }

  /**
   * Detect WordPress.com tier
   */
  private async detectWordPressCOMTier(): Promise<AccountTier> {
    try {
      // Get site info from WordPress.com API
      const response = await this.axiosInstance.get(`/sites/${this.siteId}`);
      const site = response.data;

      // Determine tier based on plan
      let tier: string = 'Free';
      let storage = '3 GB';
      let features = ['posts', 'pages', 'media'];

      if (site.plan?.name) {
        const plan = site.plan.name.toLowerCase();
        if (plan.includes('business')) {
          tier = 'Business';
          storage = '200 GB';
          features = ['posts', 'pages', 'media', 'plugins', 'themes', 'users', 'comments', 'seo', 'analytics'];
        } else if (plan.includes('premium')) {
          tier = 'Premium';
          storage = '200 GB';
          features = ['posts', 'pages', 'media', 'seo', 'analytics'];
        } else if (plan.includes('personal')) {
          tier = 'Personal';
          storage = '50 GB';
          features = ['posts', 'pages', 'media', 'analytics'];
        } else if (plan.includes('ecommerce')) {
          tier = 'eCommerce';
          storage = '200 GB';
          features = ['posts', 'pages', 'media', 'plugins', 'themes', 'users', 'comments', 'ecommerce', 'analytics'];
        }
      }

      return {
        tier: tier as any,
        siteType: 'wordpress-com',
        features,
        storage,
        apiAccess: true,
        customDomain: !site.URL.includes('wordpress.com'),
        setupInstructions: this.getSetupInstructions()
      };
    } catch (error) {
      throw new Error(`Failed to detect WordPress.com tier: ${error}`);
    }
  }

  /**
   * Detect self-hosted WordPress tier
   */
  private async detectSelfHostedTier(): Promise<AccountTier> {
    try {
      const response = await this.axiosInstance.get('/');
      
      return {
        tier: 'Self-Hosted',
        siteType: 'self-hosted',
        features: [
          'posts', 'pages', 'media', 'users', 'comments', 
          'plugins', 'themes', 'analytics', 'seo', 'ecommerce'
        ],
        storage: 'Variable',
        apiAccess: true,
        customDomain: true,
        setupInstructions: this.getSetupInstructions()
      };
    } catch (error) {
      throw new Error(`Failed to detect self-hosted tier: ${error}`);
    }
  }

  /**
   * Verify credentials
   */
  async verifyCredentials(): Promise<boolean> {
    try {
      if (this.siteType === 'wordpress-com') {
        await this.axiosInstance.get(`/sites/${this.siteId}`);
      } else {
        await this.axiosInstance.get('/');
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get site information
   */
  async getSiteInfo(): Promise<any> {
    try {
      if (this.siteType === 'wordpress-com') {
        const response = await this.axiosInstance.get(`/sites/${this.siteId}`);
        return response.data;
      } else {
        const response = await this.axiosInstance.get('/');
        return response.data;
      }
    } catch (error) {
      throw new Error(`Failed to get site info: ${error}`);
    }
  }

  /**
   * Create post
   */
  async createPost(options: CreatePostOptions): Promise<Post> {
    try {
      const endpoint = this.siteType === 'wordpress-com' ? `/sites/${this.siteId}/posts/new` : '/posts';
      
      const response = await this.axiosInstance.post(endpoint, {
        title: options.title,
        content: options.content,
        excerpt: options.excerpt,
        status: options.status || 'draft',
        categories: options.categories,
        tags: options.tags,
        featured_image: options.featuredImage,
        date: options.date
      });

      return this.mapPost(response.data);
    } catch (error) {
      throw new Error(`Failed to create post: ${error}`);
    }
  }

  /**
   * Get posts
   */
  async getPosts(options?: { limit?: number; status?: string; orderBy?: string }): Promise<Post[]> {
    try {
      const endpoint = this.siteType === 'wordpress-com' ? `/sites/${this.siteId}/posts` : '/posts';
      
      const response = await this.axiosInstance.get(endpoint, {
        params: {
          per_page: options?.limit || 10,
          status: options?.status || 'publish',
          orderby: options?.orderBy || 'date',
          order: 'desc'
        }
      });

      const posts = Array.isArray(response.data) ? response.data : response.data.posts || [];
      return posts.map(post => this.mapPost(post));
    } catch (error) {
      throw new Error(`Failed to get posts: ${error}`);
    }
  }

  /**
   * Get single post
   */
  async getPost(id: number): Promise<Post> {
    try {
      const endpoint = this.siteType === 'wordpress-com' ? `/sites/${this.siteId}/posts/${id}` : `/posts/${id}`;
      
      const response = await this.axiosInstance.get(endpoint);
      return this.mapPost(response.data);
    } catch (error) {
      throw new Error(`Failed to get post: ${error}`);
    }
  }

  /**
   * Update post
   */
  async updatePost(id: number, options: Partial<CreatePostOptions>): Promise<Post> {
    try {
      const endpoint = this.siteType === 'wordpress-com' ? `/sites/${this.siteId}/posts/${id}` : `/posts/${id}`;
      
      const response = await this.axiosInstance.post(endpoint, {
        title: options.title,
        content: options.content,
        status: options.status
      });

      return this.mapPost(response.data);
    } catch (error) {
      throw new Error(`Failed to update post: ${error}`);
    }
  }

  /**
   * Delete post
   */
  async deletePost(id: number): Promise<boolean> {
    try {
      const endpoint = this.siteType === 'wordpress-com' ? `/sites/${this.siteId}/posts/${id}/delete` : `/posts/${id}`;
      
      await this.axiosInstance.delete(endpoint);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete post: ${error}`);
    }
  }

  /**
   * Get users
   */
  async getUsers(): Promise<User[]> {
    try {
      const endpoint = this.siteType === 'wordpress-com' ? `/sites/${this.siteId}/users` : '/users';
      
      const response = await this.axiosInstance.get(endpoint);
      const users = Array.isArray(response.data) ? response.data : response.data.users || [];
      
      return users.map(user => ({
        id: user.ID || user.id,
        username: user.user_login || user.username,
        name: user.display_name || user.name,
        email: user.user_email || user.email,
        url: user.user_url || user.url || '',
        roles: user.roles || []
      }));
    } catch (error) {
      throw new Error(`Failed to get users: ${error}`);
    }
  }

  /**
   * Get single user
   */
  async getUser(id: number): Promise<User> {
    try {
      const endpoint = this.siteType === 'wordpress-com' ? `/sites/${this.siteId}/users/${id}` : `/users/${id}`;
      
      const response = await this.axiosInstance.get(endpoint);
      const user = response.data;

      return {
        id: user.ID || user.id,
        username: user.user_login || user.username,
        name: user.display_name || user.name,
        email: user.user_email || user.email,
        url: user.user_url || user.url || '',
        roles: user.roles || []
      };
    } catch (error) {
      throw new Error(`Failed to get user: ${error}`);
    }
  }

  /**
   * Get comments
   */
  async getComments(options?: { postId?: number; status?: string }): Promise<Comment[]> {
    try {
      const endpoint = this.siteType === 'wordpress-com' ? 
        `/sites/${this.siteId}/comments` : '/comments';
      
      const response = await this.axiosInstance.get(endpoint, {
        params: {
          post: options?.postId,
          status: options?.status || 'approved'
        }
      });

      const comments = Array.isArray(response.data) ? response.data : response.data.comments || [];
      
      return comments.map(comment => ({
        id: comment.ID || comment.id,
        author: comment.author_name || comment.author,
        email: comment.author_email || comment.author_email,
        content: comment.comment_content || comment.content,
        status: comment.status || 'approved',
        date: comment.date || comment.date_gmt,
        postId: comment.post_ID || comment.post
      }));
    } catch (error) {
      throw new Error(`Failed to get comments: ${error}`);
    }
  }

  /**
   * Approve comment
   */
  async approveComment(id: number): Promise<boolean> {
    try {
      const endpoint = this.siteType === 'wordpress-com' ? 
        `/sites/${this.siteId}/comments/${id}/approve` : `/comments/${id}`;
      
      await this.axiosInstance.post(endpoint, { status: 'approved' });
      return true;
    } catch (error) {
      throw new Error(`Failed to approve comment: ${error}`);
    }
  }

  /**
   * Mark comment as spam
   */
  async spamComment(id: number): Promise<boolean> {
    try {
      const endpoint = this.siteType === 'wordpress-com' ? 
        `/sites/${this.siteId}/comments/${id}/spam` : `/comments/${id}`;
      
      await this.axiosInstance.post(endpoint, { status: 'spam' });
      return true;
    } catch (error) {
      throw new Error(`Failed to spam comment: ${error}`);
    }
  }

  /**
   * Get plugins
   */
  async getPlugins(): Promise<Plugin[]> {
    try {
      if (this.siteType === 'wordpress-com') {
        const response = await this.axiosInstance.get(`/sites/${this.siteId}/plugins`);
        return response.data.plugins || [];
      } else {
        const response = await this.axiosInstance.get('/plugins');
        return response.data || [];
      }
    } catch (error) {
      throw new Error(`Failed to get plugins: ${error}`);
    }
  }

  /**
   * Get themes
   */
  async getThemes(): Promise<Theme[]> {
    try {
      if (this.siteType === 'wordpress-com') {
        const response = await this.axiosInstance.get(`/sites/${this.siteId}/themes`);
        return response.data.themes || [];
      } else {
        const response = await this.axiosInstance.get('/themes');
        return response.data || [];
      }
    } catch (error) {
      throw new Error(`Failed to get themes: ${error}`);
    }
  }

  /**
   * Map API response to Post interface
   */
  private mapPost(data: any): Post {
    return {
      id: data.ID || data.id,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt || '',
      status: data.status,
      url: data.URL || data.link,
      author: data.author?.ID || data.author,
      date: data.date || data.date_gmt,
      modified: data.modified || data.modified_gmt,
      featuredImage: data.featured_image || data.featured_media,
      categories: data.categories || [],
      tags: data.tags || []
    };
  }

  /**
   * Get setup instructions
   */
  private getSetupInstructions(): string {
    return `
Setup Instructions for WordPress Integration:

For WordPress.com:
1. Visit https://developer.wordpress.com/apps/
2. Create new OAuth application
3. Copy Client ID and Client Secret
4. Add to .env:
   WORDPRESS_COM_CLIENT_ID=your_id
   WORDPRESS_COM_CLIENT_SECRET=your_secret

For Self-Hosted WordPress:
1. Log in to WordPress admin
2. Go to Users → Your Profile
3. Scroll to "Application Passwords"
4. Create new password
5. Add to .env:
   WORDPRESS_SITE_URL=https://example.com
   WORDPRESS_APP_USERNAME=admin
   WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx

Learn more: https://developer.wordpress.org/
    `;
  }
}
