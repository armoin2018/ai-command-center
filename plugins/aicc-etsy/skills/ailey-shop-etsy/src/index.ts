import axios, { AxiosInstance } from 'axios';

// TypeScript Interfaces for Type Safety

export interface AccountTier {
  tier: 'Personal' | 'Business' | 'Plus';
  maxListings: number;
  monthlyFee: number;
  apiAccess: 'Limited' | 'Full' | 'Premium';
  analytics: 'Limited' | 'Standard' | 'Premium';
  support: 'Community' | 'Email' | 'Priority';
  features: string[];
}

export interface Shop {
  id: string;
  name: string;
  description: string;
  shopUrl: string;
  currencyCode: string;
  language: string;
  policy?: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  tags: string[];
  state: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  buyerName: string;
  buyerEmail: string;
  totalPrice: number;
  totalTaxPrice: number;
  totalShippingPrice: number;
  items: OrderItem[];
  shippingAddress: Address;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  listingId: string;
  title: string;
  price: number;
  quantity: number;
  sku?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Review {
  id: string;
  listingId: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  response?: string;
  responseDate?: string;
}

export interface ShopStats {
  totalListings: number;
  totalSales: number;
  totalRevenue: number;
  totalVisitors: number;
  activeOrders: number;
  averageRating: number;
  totalReviews: number;
  lastUpdated: string;
}

export interface ShopPolicy {
  policyId: string;
  policyType: string;
  content: string;
  lastUpdated: string;
}

export interface ExportJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  format: string;
  downloadUrl?: string;
}

export interface EtsyConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  shopId: string;
}

// Main EtsyClient Class

export class EtsyClient {
  private client: AxiosInstance;
  private shopId: string;
  private apiVersion: string = 'v3';

  constructor(config: EtsyConfig) {
    this.shopId = config.shopId;
    
    this.client = axios.create({
      baseURL: `https://openapi.etsy.com/${this.apiVersion}`,
      timeout: 30000,
      headers: {
        'x-api-key': config.apiKey,
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Account Tier Detection

  async detectAccountTier(): Promise<AccountTier> {
    try {
      const response = await this.client.get(`/shops/${this.shopId}`);
      const shop = response.data.shop || response.data;
      
      // Determine tier based on shop subscription and features
      let tier: 'Personal' | 'Business' | 'Plus' = 'Personal';
      
      if (shop.shop_tier === 'premium') {
        tier = 'Plus';
      } else if (shop.shop_tier === 'active' || shop.listing_active_count > 10) {
        tier = 'Business';
      }

      const tierMap: { [key: string]: AccountTier } = {
        Personal: {
          tier: 'Personal',
          maxListings: 10,
          monthlyFee: 0,
          apiAccess: 'Limited',
          analytics: 'Limited',
          support: 'Community',
          features: ['Basic shop setup', 'Limited analytics', 'Community support only', '10 active listings']
        },
        Business: {
          tier: 'Business',
          maxListings: 50,
          monthlyFee: 0,
          apiAccess: 'Full',
          analytics: 'Standard',
          support: 'Email',
          features: ['Advanced shop customization', 'Detailed analytics', 'Email support', '50 active listings', 'Bulk operations']
        },
        Plus: {
          tier: 'Plus',
          maxListings: 300,
          monthlyFee: 15.95,
          apiAccess: 'Premium',
          analytics: 'Premium',
          support: 'Priority',
          features: ['All Business features', 'Premium analytics', 'Priority support', '300 active listings', 'Shipping discounts', '$5 advertising credit']
        }
      };

      return tierMap[tier];
    } catch (error) {
      throw new Error(`Failed to detect account tier: ${error}`);
    }
  }

  // Shop Operations

  async getShopInfo(): Promise<Shop> {
    try {
      const response = await this.client.get(`/shops/${this.shopId}`);
      const shop = response.data.shop || response.data;
      
      return {
        id: shop.shop_id,
        name: shop.shop_name,
        description: shop.shop_notice || '',
        shopUrl: shop.url,
        currencyCode: shop.currency_code,
        language: shop.primary_language,
        policy: shop.policy_privacy
      };
    } catch (error) {
      throw new Error(`Failed to get shop info: ${error}`);
    }
  }

  async updateShopSettings(updates: Record<string, any>): Promise<Shop> {
    try {
      const response = await this.client.put(`/shops/${this.shopId}`, updates);
      const shop = response.data.shop || response.data;
      
      return {
        id: shop.shop_id,
        name: shop.shop_name,
        description: shop.shop_notice,
        shopUrl: shop.url,
        currencyCode: shop.currency_code,
        language: shop.primary_language
      };
    } catch (error) {
      throw new Error(`Failed to update shop settings: ${error}`);
    }
  }

  async listShopPolicies(): Promise<ShopPolicy[]> {
    try {
      const response = await this.client.get(`/shops/${this.shopId}/policies`);
      const policies = response.data.policies || response.data.results || [];
      
      return policies.map((p: any) => ({
        policyId: p.policy_id,
        policyType: p.policy_type,
        content: p.content,
        lastUpdated: p.updated_tsz
      }));
    } catch (error) {
      throw new Error(`Failed to list shop policies: ${error}`);
    }
  }

  async updateShopPolicy(policyType: string, content: string): Promise<ShopPolicy> {
    try {
      const response = await this.client.put(`/shops/${this.shopId}/policies/${policyType}`, {
        content
      });
      const policy = response.data.policy || response.data;
      
      return {
        policyId: policy.policy_id,
        policyType: policy.policy_type,
        content: policy.content,
        lastUpdated: policy.updated_tsz
      };
    } catch (error) {
      throw new Error(`Failed to update shop policy: ${error}`);
    }
  }

  async getShopStats(): Promise<ShopStats> {
    try {
      const response = await this.client.get(`/shops/${this.shopId}/stats`);
      const stats = response.data.results || response.data;
      
      return {
        totalListings: stats.total_listings || 0,
        totalSales: stats.total_sales || 0,
        totalRevenue: stats.total_revenue || 0,
        totalVisitors: stats.total_visitors || 0,
        activeOrders: stats.active_orders || 0,
        averageRating: stats.average_rating || 0,
        totalReviews: stats.total_reviews || 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get shop stats: ${error}`);
    }
  }

  // Listing Operations

  async createListing(listingData: {
    title: string;
    description: string;
    price: number;
    quantity: number;
    category?: string;
    tags?: string[];
  }): Promise<Listing> {
    try {
      const payload = {
        title: listingData.title,
        description: listingData.description,
        price: listingData.price,
        quantity: listingData.quantity,
        category: listingData.category,
        tags: listingData.tags || []
      };

      const response = await this.client.post(`/shops/${this.shopId}/listings`, payload);
      const listing = response.data.listing || response.data;
      
      return this.mapListing(listing);
    } catch (error) {
      throw new Error(`Failed to create listing: ${error}`);
    }
  }

  async updateListing(listingId: string, updates: Record<string, any>): Promise<Listing> {
    try {
      const response = await this.client.put(`/shops/${this.shopId}/listings/${listingId}`, updates);
      const listing = response.data.listing || response.data;
      
      return this.mapListing(listing);
    } catch (error) {
      throw new Error(`Failed to update listing: ${error}`);
    }
  }

  async deleteListing(listingId: string): Promise<boolean> {
    try {
      await this.client.delete(`/shops/${this.shopId}/listings/${listingId}`);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete listing: ${error}`);
    }
  }

  async getListing(listingId: string): Promise<Listing> {
    try {
      const response = await this.client.get(`/listings/${listingId}`);
      const listing = response.data.listing || response.data;
      
      return this.mapListing(listing);
    } catch (error) {
      throw new Error(`Failed to get listing: ${error}`);
    }
  }

  async listListings(filters?: {
    limit?: number;
    offset?: number;
    sort?: string;
  }): Promise<Listing[]> {
    try {
      const params = new URLSearchParams({
        limit: (filters?.limit || 20).toString(),
        offset: (filters?.offset || 0).toString(),
        sort: filters?.sort || 'created'
      });

      const response = await this.client.get(`/shops/${this.shopId}/listings?${params}`);
      const listings = response.data.results || response.data.listings || [];
      
      return listings.map((l: any) => this.mapListing(l));
    } catch (error) {
      throw new Error(`Failed to list listings: ${error}`);
    }
  }

  // Order Operations

  async listOrders(filters?: {
    limit?: number;
    offset?: number;
    sort?: string;
  }): Promise<Order[]> {
    try {
      const params = new URLSearchParams({
        limit: (filters?.limit || 20).toString(),
        offset: (filters?.offset || 0).toString(),
        sort: filters?.sort || 'created'
      });

      const response = await this.client.get(`/shops/${this.shopId}/orders?${params}`);
      const orders = response.data.results || response.data.orders || [];
      
      return orders.map((o: any) => this.mapOrder(o));
    } catch (error) {
      throw new Error(`Failed to list orders: ${error}`);
    }
  }

  async getOrder(orderId: string): Promise<Order> {
    try {
      const response = await this.client.get(`/shops/${this.shopId}/orders/${orderId}`);
      const order = response.data.order || response.data;
      
      return this.mapOrder(order);
    } catch (error) {
      throw new Error(`Failed to get order: ${error}`);
    }
  }

  async fulfillOrder(orderId: string, trackingData: {
    tracking: string;
    carrier: string;
  }): Promise<Order> {
    try {
      const payload = {
        tracking_code: trackingData.tracking,
        carrier_name: trackingData.carrier
      };

      const response = await this.client.post(`/shops/${this.shopId}/orders/${orderId}/fulfillment`, payload);
      const order = response.data.order || response.data;
      
      return this.mapOrder(order);
    } catch (error) {
      throw new Error(`Failed to fulfill order: ${error}`);
    }
  }

  async sendOrderMessage(orderId: string, message: string): Promise<boolean> {
    try {
      await this.client.post(`/shops/${this.shopId}/orders/${orderId}/messages`, {
        message
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to send order message: ${error}`);
    }
  }

  // Review Operations

  async listReviews(filters?: {
    limit?: number;
    offset?: number;
  }): Promise<Review[]> {
    try {
      const params = new URLSearchParams({
        limit: (filters?.limit || 20).toString(),
        offset: (filters?.offset || 0).toString()
      });

      const response = await this.client.get(`/shops/${this.shopId}/reviews?${params}`);
      const reviews = response.data.results || response.data.reviews || [];
      
      return reviews.map((r: any) => ({
        id: r.review_id,
        listingId: r.listing_id,
        buyerName: r.reviewer_name,
        rating: r.rating,
        comment: r.review_text,
        createdAt: r.create_tsz,
        response: r.response_text,
        responseDate: r.response_tsz
      }));
    } catch (error) {
      throw new Error(`Failed to list reviews: ${error}`);
    }
  }

  async respondToReview(reviewId: string, response: string): Promise<Review> {
    try {
      const payload = { response_text: response };
      const apiResponse = await this.client.post(`/shops/${this.shopId}/reviews/${reviewId}/response`, payload);
      const review = apiResponse.data.review || apiResponse.data;
      
      return {
        id: review.review_id,
        listingId: review.listing_id,
        buyerName: review.reviewer_name,
        rating: review.rating,
        comment: review.review_text,
        createdAt: review.create_tsz,
        response: review.response_text,
        responseDate: review.response_tsz
      };
    } catch (error) {
      throw new Error(`Failed to respond to review: ${error}`);
    }
  }

  async getReviewSummary(): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    try {
      const response = await this.client.get(`/shops/${this.shopId}/reviews/summary`);
      const summary = response.data;
      
      return {
        totalReviews: summary.total_reviews,
        averageRating: summary.average_rating,
        ratingDistribution: summary.rating_distribution || {}
      };
    } catch (error) {
      throw new Error(`Failed to get review summary: ${error}`);
    }
  }

  // Analytics

  async getListingsPerformance(days: number = 30): Promise<Array<{
    listingId: string;
    title: string;
    views: number;
    favorites: number;
    sales: number;
  }>> {
    try {
      const response = await this.client.get(`/shops/${this.shopId}/listings/analytics?days=${days}`);
      const analytics = response.data.results || response.data.listings || [];
      
      return analytics.map((a: any) => ({
        listingId: a.listing_id,
        title: a.title,
        views: a.views,
        favorites: a.favorites,
        sales: a.sales
      }));
    } catch (error) {
      throw new Error(`Failed to get listings performance: ${error}`);
    }
  }

  async getSalesReport(startDate: string, endDate: string): Promise<{
    startDate: string;
    endDate: string;
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    try {
      const response = await this.client.get(
        `/shops/${this.shopId}/sales/report?start_date=${startDate}&end_date=${endDate}`
      );
      const report = response.data;
      
      return {
        startDate,
        endDate,
        totalSales: report.total_sales || 0,
        totalRevenue: report.total_revenue || 0,
        averageOrderValue: report.average_order_value || 0
      };
    } catch (error) {
      throw new Error(`Failed to get sales report: ${error}`);
    }
  }

  // Helper Methods

  private mapListing(listing: any): Listing {
    return {
      id: listing.listing_id || listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      quantity: listing.quantity,
      category: listing.category,
      tags: listing.tags || [],
      state: listing.state || 'active',
      createdAt: listing.created_tsz || listing.created_at,
      updatedAt: listing.updated_tsz || listing.updated_at
    };
  }

  private mapOrder(order: any): Order {
    return {
      id: order.order_id || order.id,
      buyerName: order.buyer_name || order.buyer?.name || '',
      buyerEmail: order.buyer_email || order.buyer?.email || '',
      totalPrice: order.total_price || 0,
      totalTaxPrice: order.total_tax_price || 0,
      totalShippingPrice: order.total_shipping_price || 0,
      items: (order.items || []).map((i: any) => ({
        id: i.item_id,
        listingId: i.listing_id,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
        sku: i.sku
      })),
      shippingAddress: {
        street: order.shipping_address?.street || '',
        city: order.shipping_address?.city || '',
        state: order.shipping_address?.state || '',
        zip: order.shipping_address?.zip || '',
        country: order.shipping_address?.country || ''
      },
      status: order.status || 'pending',
      createdAt: order.created_tsz || order.created_at,
      updatedAt: order.updated_tsz || order.updated_at
    };
  }
}

export default EtsyClient;
