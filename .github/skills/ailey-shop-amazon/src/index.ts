import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

// TypeScript Interfaces for Type Safety

export interface AccountTier {
  tier: 'Individual' | 'Professional' | 'Vendor';
  monthlyFee: number;
  perItemFee: number;
  apiAccess: 'Limited' | 'Full' | 'Vendor';
  advertising: boolean;
  bulkOperations: boolean;
  advancedTools: boolean;
  features: string[];
}

export interface Product {
  sku: string;
  asin?: string;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  condition: 'New' | 'Used' | 'Refurbished';
  fulfillmentChannel: 'FBA' | 'FBM';
  category?: string;
  brand?: string;
  status: 'Active' | 'Inactive';
}

export interface Order {
  orderId: string;
  purchaseDate: string;
  orderStatus: 'Pending' | 'Unshipped' | 'Shipped' | 'Canceled';
  fulfillmentChannel: 'FBA' | 'FBM';
  salesChannel: string;
  orderTotal: number;
  numberOfItemsShipped: number;
  numberOfItemsUnshipped: number;
  buyerEmail?: string;
  buyerName?: string;
  shippingAddress?: Address;
  items: OrderItem[];
}

export interface OrderItem {
  orderItemId: string;
  sku: string;
  asin: string;
  title: string;
  quantityOrdered: number;
  quantityShipped: number;
  itemPrice: number;
  itemTax: number;
}

export interface Address {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateOrRegion: string;
  postalCode: string;
  countryCode: string;
}

export interface InventoryLevel {
  sku: string;
  fnSku?: string;
  asin: string;
  quantity: number;
  fulfillmentChannel: 'FBA' | 'FBM';
  condition: 'NewItem' | 'UsedLikeNew' | 'UsedVeryGood';
  availableQuantity: number;
  inboundQuantity: number;
}

export interface Review {
  reviewId: string;
  asin: string;
  reviewerName: string;
  rating: number;
  title: string;
  comment: string;
  reviewDate: string;
  verified: boolean;
}

export interface Campaign {
  campaignId: string;
  name: string;
  campaignType: 'sponsoredProducts' | 'sponsoredBrands' | 'sponsoredDisplay';
  targetingType: 'auto' | 'manual';
  state: 'enabled' | 'paused' | 'archived';
  dailyBudget: number;
  startDate: string;
  endDate?: string;
}

export interface CampaignMetrics {
  campaignId: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  ctr: number;
  acos: number;
  roas: number;
}

export interface AmazonConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessKeyId: string;
  secretAccessKey: string;
  sellerId: string;
  marketplaceId: string;
  region?: string;
  endpoint?: string;
}

// Main AmazonClient Class

export class AmazonClient {
  private client: AxiosInstance;
  private sellerId: string;
  private marketplaceId: string;
  private region: string;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: AmazonConfig) {
    this.sellerId = config.sellerId;
    this.marketplaceId = config.marketplaceId;
    this.region = config.region || 'us-east-1';

    const endpoint = config.endpoint || 'https://sellingpartnerapi-na.amazon.com';

    this.client = axios.create({
      baseURL: endpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Store config for token refresh
    this.config = config;
  }

  private config: AmazonConfig;

  // Token Management

  private async getAccessToken(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Refresh token
    const response = await axios.post('https://api.amazon.com/auth/o2/token', {
      grant_type: 'refresh_token',
      refresh_token: this.config.refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

    return this.accessToken;
  }

  // Account Tier Detection

  async detectAccountTier(): Promise<AccountTier> {
    try {
      const token = await this.getAccessToken();
      
      // Get seller account info to determine tier
      const response = await this.client.get('/sellers/v1/account', {
        headers: {
          'x-amz-access-token': token
        }
      });

      const account = response.data;
      
      // Determine tier based on account attributes
      let tier: 'Individual' | 'Professional' | 'Vendor' = 'Individual';
      
      if (account.accountType === 'vendor') {
        tier = 'Vendor';
      } else if (account.subscriptionLevel === 'professional' || account.monthlyFee > 0) {
        tier = 'Professional';
      }

      const tierMap: { [key: string]: AccountTier } = {
        Individual: {
          tier: 'Individual',
          monthlyFee: 0,
          perItemFee: 0.99,
          apiAccess: 'Limited',
          advertising: false,
          bulkOperations: false,
          advancedTools: false,
          features: ['Basic product listings', 'FBA & FBM fulfillment', 'Basic reports', 'Email support']
        },
        Professional: {
          tier: 'Professional',
          monthlyFee: 39.99,
          perItemFee: 0,
          apiAccess: 'Full',
          advertising: true,
          bulkOperations: true,
          advancedTools: true,
          features: ['Unlimited listings', 'Full API access', 'Advertising', 'Bulk operations', 'Advanced reports', 'Priority support']
        },
        Vendor: {
          tier: 'Vendor',
          monthlyFee: 0,
          perItemFee: 0,
          apiAccess: 'Vendor',
          advertising: true,
          bulkOperations: true,
          advancedTools: true,
          features: ['Wholesale to Amazon', 'Amazon manages fulfillment', 'Vendor Central API', 'Enhanced brand content', 'Amazon Vine']
        }
      };

      return tierMap[tier];
    } catch (error) {
      throw new Error(`Failed to detect account tier: ${error}`);
    }
  }

  // Product Operations

  async createProduct(productData: {
    sku: string;
    title: string;
    price: number;
    quantity: number;
    description?: string;
    brand?: string;
    category?: string;
  }): Promise<Product> {
    try {
      const token = await this.getAccessToken();

      const payload = {
        sku: productData.sku,
        product_type: productData.category || 'PRODUCT',
        attributes: {
          item_name: [{ value: productData.title, marketplace_id: this.marketplaceId }],
          brand: [{ value: productData.brand || 'Generic', marketplace_id: this.marketplaceId }],
          externally_assigned_product_identifier: [{
            value: productData.sku,
            marketplace_id: this.marketplaceId,
            type: 'sku'
          }]
        }
      };

      await this.client.put(`/listings/2021-08-01/items/${this.sellerId}/${productData.sku}`, payload, {
        headers: {
          'x-amz-access-token': token
        },
        params: {
          marketplaceIds: this.marketplaceId
        }
      });

      // Set price and inventory
      await this.updatePrice(productData.sku, productData.price);
      await this.updateInventory(productData.sku, productData.quantity);

      return {
        sku: productData.sku,
        title: productData.title,
        price: productData.price,
        quantity: productData.quantity,
        condition: 'New',
        fulfillmentChannel: 'FBM',
        status: 'Active'
      };
    } catch (error) {
      throw new Error(`Failed to create product: ${error}`);
    }
  }

  async updateProduct(sku: string, updates: Partial<Product>): Promise<Product> {
    try {
      const token = await this.getAccessToken();

      if (updates.price !== undefined) {
        await this.updatePrice(sku, updates.price);
      }

      if (updates.quantity !== undefined) {
        await this.updateInventory(sku, updates.quantity);
      }

      // Get updated product info
      return await this.getProduct(sku);
    } catch (error) {
      throw new Error(`Failed to update product: ${error}`);
    }
  }

  async getProduct(sku: string): Promise<Product> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/listings/2021-08-01/items/${this.sellerId}/${sku}`, {
        headers: {
          'x-amz-access-token': token
        },
        params: {
          marketplaceIds: this.marketplaceId
        }
      });

      const item = response.data.summaries[0];

      return {
        sku: item.sku,
        asin: item.asin,
        title: item.itemName,
        price: 0, // Need separate pricing call
        quantity: 0, // Need separate inventory call
        condition: 'New',
        fulfillmentChannel: item.fulfillmentChannel || 'FBM',
        status: item.status
      };
    } catch (error) {
      throw new Error(`Failed to get product: ${error}`);
    }
  }

  async listProducts(filters?: {
    limit?: number;
    nextToken?: string;
  }): Promise<Product[]> {
    try {
      const token = await this.getAccessToken();

      const params: any = {
        marketplaceIds: this.marketplaceId,
        sellerId: this.sellerId
      };

      if (filters?.limit) params.pageSize = filters.limit;
      if (filters?.nextToken) params.nextToken = filters.nextToken;

      const response = await this.client.get('/catalog/2022-04-01/items', {
        headers: {
          'x-amz-access-token': token
        },
        params
      });

      const items = response.data.items || [];

      return items.map((item: any) => ({
        sku: item.sku || '',
        asin: item.asin,
        title: item.summaries[0]?.itemName || '',
        price: 0,
        quantity: 0,
        condition: 'New',
        fulfillmentChannel: 'FBM',
        status: 'Active'
      }));
    } catch (error) {
      throw new Error(`Failed to list products: ${error}`);
    }
  }

  private async updatePrice(sku: string, price: number): Promise<void> {
    const token = await this.getAccessToken();

    await this.client.post('/productPricing/v0/offers', {
      sku,
      MarketplaceId: this.marketplaceId,
      Price: {
        ListingPrice: {
          CurrencyCode: 'USD',
          Amount: price
        }
      }
    }, {
      headers: {
        'x-amz-access-token': token
      }
    });
  }

  // Order Operations

  async listOrders(filters?: {
    limit?: number;
    status?: string;
    createdAfter?: string;
  }): Promise<Order[]> {
    try {
      const token = await this.getAccessToken();

      const params: any = {
        MarketplaceIds: this.marketplaceId,
        MaxResultsPerPage: filters?.limit || 20
      };

      if (filters?.status) {
        params.OrderStatuses = filters.status;
      }

      if (filters?.createdAfter) {
        params.CreatedAfter = filters.createdAfter;
      } else {
        // Default to last 30 days
        const date = new Date();
        date.setDate(date.getDate() - 30);
        params.CreatedAfter = date.toISOString();
      }

      const response = await this.client.get('/orders/v0/orders', {
        headers: {
          'x-amz-access-token': token
        },
        params
      });

      const orders = response.data.payload?.Orders || [];

      return orders.map((o: any) => this.mapOrder(o));
    } catch (error) {
      throw new Error(`Failed to list orders: ${error}`);
    }
  }

  async getOrder(orderId: string): Promise<Order> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/orders/v0/orders/${orderId}`, {
        headers: {
          'x-amz-access-token': token
        }
      });

      const order = response.data.payload;

      // Get order items
      const itemsResponse = await this.client.get(`/orders/v0/orders/${orderId}/orderItems`, {
        headers: {
          'x-amz-access-token': token
        }
      });

      const items = itemsResponse.data.payload?.OrderItems || [];

      return {
        ...this.mapOrder(order),
        items: items.map((i: any) => ({
          orderItemId: i.OrderItemId,
          sku: i.SellerSKU,
          asin: i.ASIN,
          title: i.Title,
          quantityOrdered: i.QuantityOrdered,
          quantityShipped: i.QuantityShipped,
          itemPrice: parseFloat(i.ItemPrice?.Amount || 0),
          itemTax: parseFloat(i.ItemTax?.Amount || 0)
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get order: ${error}`);
    }
  }

  async confirmShipment(orderId: string, trackingData: {
    trackingNumber: string;
    carrierCode: string;
  }): Promise<Order> {
    try {
      const token = await this.getAccessToken();

      await this.client.post(`/orders/v0/orders/${orderId}/shipmentConfirmation`, {
        packageDetail: {
          packageReferenceId: '1',
          carrierCode: trackingData.carrierCode,
          trackingNumber: trackingData.trackingNumber,
          shipDate: new Date().toISOString()
        }
      }, {
        headers: {
          'x-amz-access-token': token
        }
      });

      return await this.getOrder(orderId);
    } catch (error) {
      throw new Error(`Failed to confirm shipment: ${error}`);
    }
  }

  // Inventory Operations

  async getInventoryLevels(sku: string): Promise<InventoryLevel> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get('/fba/inventory/v1/summaries', {
        headers: {
          'x-amz-access-token': token
        },
        params: {
          granularityType: 'Marketplace',
          granularityId: this.marketplaceId,
          marketplaceIds: this.marketplaceId,
          sellerSkus: sku
        }
      });

      const summary = response.data.payload?.inventorySummaries?.[0];

      if (!summary) {
        throw new Error('Inventory not found');
      }

      return {
        sku: summary.sellerSku,
        fnSku: summary.fnSku,
        asin: summary.asin,
        quantity: summary.totalQuantity || 0,
        fulfillmentChannel: 'FBA',
        condition: summary.condition,
        availableQuantity: summary.inventoryDetails?.fulfillableQuantity || 0,
        inboundQuantity: summary.inventoryDetails?.inboundWorkingQuantity || 0
      };
    } catch (error) {
      throw new Error(`Failed to get inventory levels: ${error}`);
    }
  }

  async updateInventory(sku: string, quantity: number): Promise<void> {
    try {
      const token = await this.getAccessToken();

      await this.client.post('/listings/2021-08-01/items/${this.sellerId}/${sku}/quantity', {
        sku,
        quantity,
        fulfillmentAvailability: [{
          fulfillmentChannelCode: 'DEFAULT',
          quantity
        }]
      }, {
        headers: {
          'x-amz-access-token': token
        },
        params: {
          marketplaceIds: this.marketplaceId
        }
      });
    } catch (error) {
      throw new Error(`Failed to update inventory: ${error}`);
    }
  }

  async listFBAInventory(limit: number = 50): Promise<InventoryLevel[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get('/fba/inventory/v1/summaries', {
        headers: {
          'x-amz-access-token': token
        },
        params: {
          granularityType: 'Marketplace',
          granularityId: this.marketplaceId,
          marketplaceIds: this.marketplaceId
        }
      });

      const summaries = response.data.payload?.inventorySummaries || [];

      return summaries.slice(0, limit).map((s: any) => ({
        sku: s.sellerSku,
        fnSku: s.fnSku,
        asin: s.asin,
        quantity: s.totalQuantity || 0,
        fulfillmentChannel: 'FBA',
        condition: s.condition,
        availableQuantity: s.inventoryDetails?.fulfillableQuantity || 0,
        inboundQuantity: s.inventoryDetails?.inboundWorkingQuantity || 0
      }));
    } catch (error) {
      throw new Error(`Failed to list FBA inventory: ${error}`);
    }
  }

  // Advertising Operations (Professional Only)

  async listCampaigns(limit: number = 20): Promise<Campaign[]> {
    try {
      // Note: Advertising API uses different authentication
      // This is a simplified version
      const campaigns: Campaign[] = [];
      return campaigns;
    } catch (error) {
      throw new Error(`Failed to list campaigns: ${error}`);
    }
  }

  async getCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
    try {
      // Advertising metrics endpoint
      return {
        campaignId,
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        orders: 0,
        ctr: 0,
        acos: 0,
        roas: 0
      };
    } catch (error) {
      throw new Error(`Failed to get campaign metrics: ${error}`);
    }
  }

  // Review Operations

  async listReviews(filters?: {
    limit?: number;
    asin?: string;
  }): Promise<Review[]> {
    try {
      const token = await this.getAccessToken();

      // Note: Reviews are typically accessed via Product Advertising API
      // This is a placeholder for the structure
      const reviews: Review[] = [];
      return reviews;
    } catch (error) {
      throw new Error(`Failed to list reviews: ${error}`);
    }
  }

  async requestReview(orderId: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();

      await this.client.post(`/solicitations/v1/orders/${orderId}/solicitations/productReviewAndSellerFeedback`, {}, {
        headers: {
          'x-amz-access-token': token
        },
        params: {
          marketplaceIds: this.marketplaceId
        }
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to request review: ${error}`);
    }
  }

  // Helper Methods

  private mapOrder(order: any): Order {
    return {
      orderId: order.AmazonOrderId,
      purchaseDate: order.PurchaseDate,
      orderStatus: order.OrderStatus,
      fulfillmentChannel: order.FulfillmentChannel === 'AFN' ? 'FBA' : 'FBM',
      salesChannel: order.SalesChannel,
      orderTotal: parseFloat(order.OrderTotal?.Amount || 0),
      numberOfItemsShipped: order.NumberOfItemsShipped || 0,
      numberOfItemsUnshipped: order.NumberOfItemsUnshipped || 0,
      buyerEmail: order.BuyerEmail,
      buyerName: order.BuyerName,
      shippingAddress: order.ShippingAddress ? {
        name: order.ShippingAddress.Name,
        addressLine1: order.ShippingAddress.AddressLine1,
        addressLine2: order.ShippingAddress.AddressLine2,
        city: order.ShippingAddress.City,
        stateOrRegion: order.ShippingAddress.StateOrRegion,
        postalCode: order.ShippingAddress.PostalCode,
        countryCode: order.ShippingAddress.CountryCode
      } : undefined,
      items: []
    };
  }
}

export default AmazonClient;
