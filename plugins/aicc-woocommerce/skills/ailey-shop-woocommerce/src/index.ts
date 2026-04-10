import axios, { AxiosInstance } from 'axios';

/**
 * Account tier information with feature list
 */
export interface AccountTier {
  tier: string;
  storeType: 'self-hosted' | 'woocommerce-com';
  features: string[];
  storage: string;
  productLimit: number;
  apiCallsPerMinute: number;
  supportLevel: string;
}

/**
 * Product information
 */
export interface Product {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  dateCreated: string;
  dateModified: string;
  type: string;
  status: string;
  featured: boolean;
  catalogVisibility: string;
  description: string;
  shortDescription: string;
  sku: string;
  price: string;
  regularPrice: string;
  salePrice: string;
  onSale: boolean;
  purchasable: boolean;
  totalSales: number;
  virtual: boolean;
  downloadable: boolean;
  downloadLimit: number;
  downloadExpires: number;
  externalUrl: string;
  buttonText: string;
  taxStatus: string;
  taxClass: string;
  manageStock: boolean;
  stockQuantity: number;
  stockStatus: string;
  backorders: string;
  backordersAllowed: boolean;
  backordered: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shippingRequired: boolean;
  shippingTaxable: boolean;
  shippingClass: string;
  reviewsAllowed: boolean;
  averageRating: string;
  ratingCount: number;
  upsellIds: number[];
  crossSellIds: number[];
  parentId: number;
  purchaseNote: string;
  categories: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string }>;
  images: Array<{ id: number; src: string; alt: string }>;
  attributes: any[];
  defaultAttributes: any[];
  variations: number[];
  groupedProducts: number[];
  menuOrder: number;
}

/**
 * Order information
 */
export interface Order {
  id: number;
  orderNumber: number;
  parentId: number;
  status: string;
  currency: string;
  dateCreated: string;
  dateModified: string;
  discountTotal: string;
  discountTax: string;
  shippingTotal: string;
  shippingTax: string;
  cartTax: string;
  total: string;
  totalTax: string;
  customerIP: string;
  customerUserAgent: string;
  customerNote: string;
  billingAddress: any;
  shippingAddress: any;
  paymentMethod: string;
  paymentMethodTitle: string;
  transactionId: string;
  dateCompleted: string | null;
  datePaid: string | null;
  cartHash: string;
  customerId: number;
  lineItems: LineItem[];
  taxLines: any[];
  shippingLines: any[];
  feeLines: any[];
  couponLines: any[];
  refunds: any[];
  setPaid: boolean;
}

/**
 * Order line item
 */
export interface LineItem {
  id: number;
  name: string;
  productId: number;
  variationId: number;
  quantity: number;
  taxClass: string;
  subtotal: string;
  subtotalTax: string;
  total: string;
  totalTax: string;
  taxes: any[];
  metaData: any[];
  sku: string;
  price: string;
}

/**
 * Customer information
 */
export interface Customer {
  id: number;
  dateCreated: string;
  dateModified: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  username: string;
  name: string;
  avatarUrl: string;
  billingAddress: any;
  shippingAddress: any;
  isPayingCustomer: boolean;
  ordersCount: number;
  totalSpent: string;
  links: any[];
}

/**
 * Payment transaction
 */
export interface Payment {
  id: number;
  orderId: number;
  method: string;
  status: string;
  amount: number;
  currency: string;
  dateCreated: string;
  transactionId: string;
  gatewayResponse: any;
}

/**
 * Shipping zone
 */
export interface ShippingZone {
  id: number;
  name: string;
  order: number;
  locations: any[];
  methods: ShippingMethod[];
}

/**
 * Shipping method
 */
export interface ShippingMethod {
  id: string;
  instanceId: number;
  title: string;
  order: number;
  enabled: boolean;
  methodId: string;
  methodTitle: string;
  settings: any;
}

/**
 * Create product options
 */
export interface CreateProductOptions {
  name: string;
  price: number;
  sku: string;
  description?: string;
  shortDescription?: string;
  categories?: number[];
  tags?: number[];
  images?: Array<{ src: string; alt?: string }>;
  variations?: ProductVariation[];
  stock?: number;
  weight?: string;
  dimensions?: { length: string; width: string; height: string };
  taxStatus?: string;
  taxClass?: string;
  manageStock?: boolean;
}

/**
 * Product variation
 */
export interface ProductVariation {
  sku: string;
  price: number;
  stock?: number;
  attributes?: any;
}

/**
 * WooCommerce configuration
 */
export interface WooCommerceConfig {
  storeUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  email?: string;
  password?: string;
  storeType: 'self-hosted' | 'woocommerce-com';
  apiVersion?: string;
  timeout?: number;
}

/**
 * WooCommerce Client for REST API interaction
 */
export class WooCommerceClient {
  private config: WooCommerceConfig;
  private client: AxiosInstance;

  constructor(config: WooCommerceConfig) {
    this.config = {
      apiVersion: 'wc/v3',
      timeout: 30000,
      ...config,
    };

    const baseURL = this.config.storeUrl
      ? `${this.config.storeUrl}/wp-json/${this.config.apiVersion}/`
      : 'https://api.woocommerce.com/';

    if (this.config.storeType === 'self-hosted') {
      this.client = axios.create({
        baseURL,
        auth: {
          username: this.config.apiKey || '',
          password: this.config.apiSecret || '',
        },
        timeout: this.config.timeout,
      });
    } else {
      // WooCommerce.com uses bearer token (would need OAuth flow in production)
      this.client = axios.create({
        baseURL,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        timeout: this.config.timeout,
      });
    }
  }

  /**
   * Detect account tier and capabilities
   */
  async detectAccountTier(): Promise<AccountTier> {
    try {
      if (this.config.storeType === 'self-hosted') {
        return this.detectSelfHostedTier();
      } else {
        return this.detectWooCommerceCOMTier();
      }
    } catch (error) {
      throw new Error(`Failed to detect account tier: ${error}`);
    }
  }

  /**
   * Detect self-hosted WooCommerce tier
   */
  private async detectSelfHostedTier(): Promise<AccountTier> {
    try {
      const response = await this.client.get('products', { params: { per_page: 1 } });
      const settings = await this.client.get('settings');

      // Determine tier based on available features
      // This is a simplified detection - could be enhanced with plugin detection
      const hasAdvancedFeatures = settings.data.some((s: any) =>
        s.id?.includes('woocommerce_tax') || s.id?.includes('woocommerce_shipping')
      );

      let tier = 'Starter';
      let features = [
        'Basic product management',
        'Standard orders',
        'Basic reporting',
        'Product variations',
        'Simple customer management',
      ];

      if (hasAdvancedFeatures) {
        tier = 'Professional';
        features = [
          ...features,
          'Advanced product management',
          'Subscriptions',
          'Marketing automation',
          'Advanced reports',
          'Bulk operations',
        ];
      }

      return {
        tier,
        storeType: 'self-hosted',
        features,
        storage: 'Unlimited',
        productLimit: 999999,
        apiCallsPerMinute: 120,
        supportLevel: 'Community',
      };
    } catch (error) {
      throw new Error(`Failed to detect self-hosted tier: ${error}`);
    }
  }

  /**
   * Detect WooCommerce.com tier
   */
  private async detectWooCommerceCOMTier(): Promise<AccountTier> {
    try {
      const response = await this.client.get('sites/me');
      const planType = response.data?.plan?.name?.toLowerCase() || 'free';

      const tierMap: { [key: string]: AccountTier } = {
        free: {
          tier: 'Free',
          storeType: 'woocommerce-com',
          features: ['Basic store', 'Up to 100 products', 'Basic orders', 'Limited support'],
          storage: '5GB',
          productLimit: 100,
          apiCallsPerMinute: 20,
          supportLevel: 'Community',
        },
        starter: {
          tier: 'Starter',
          storeType: 'woocommerce-com',
          features: [
            'Full product management',
            'Up to 5000 products',
            'Automated email',
            'Basic reports',
            'Email support',
          ],
          storage: '50GB',
          productLimit: 5000,
          apiCallsPerMinute: 60,
          supportLevel: 'Email',
        },
        business: {
          tier: 'Business',
          storeType: 'woocommerce-com',
          features: [
            'Advanced products',
            'Unlimited products',
            'Subscriptions',
            'Marketing tools',
            'Advanced reports',
            'Priority support',
          ],
          storage: '500GB',
          productLimit: 999999,
          apiCallsPerMinute: 240,
          supportLevel: 'Priority',
        },
        commerce: {
          tier: 'Commerce',
          storeType: 'woocommerce-com',
          features: [
            'All Business features',
            'Unlimited storage',
            'Priority support',
            'Custom plugins',
            'Advanced integrations',
            'Exclusive tools',
          ],
          storage: 'Unlimited',
          productLimit: 999999,
          apiCallsPerMinute: 600,
          supportLevel: '24/7 Priority',
        },
      };

      return tierMap[planType] || tierMap['free'];
    } catch (error) {
      // Default to free tier if detection fails
      return {
        tier: 'Free',
        storeType: 'woocommerce-com',
        features: ['Basic store', 'Up to 100 products', 'Basic orders'],
        storage: '5GB',
        productLimit: 100,
        apiCallsPerMinute: 20,
        supportLevel: 'Community',
      };
    }
  }

  /**
   * Verify API credentials are valid
   */
  async verifyCredentials(): Promise<boolean> {
    try {
      await this.client.get('settings');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get store information
   */
  async getStoreInfo(): Promise<any> {
    try {
      const response = await this.client.get('settings');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get store info: ${error}`);
    }
  }

  /**
   * Create a new product
   */
  async createProduct(options: CreateProductOptions): Promise<Product> {
    try {
      const response = await this.client.post('products', {
        name: options.name,
        type: 'simple',
        regular_price: String(options.price),
        sku: options.sku,
        description: options.description || '',
        short_description: options.shortDescription || '',
        stock_quantity: options.stock || 0,
        manage_stock: options.manageStock ?? true,
        images: options.images?.map((img) => ({ src: img.src, alt: img.alt || '' })) || [],
        categories: options.categories?.map((id) => ({ id })) || [],
        tags: options.tags?.map((id) => ({ id })) || [],
        weight: options.weight || '',
        dimensions: options.dimensions,
        tax_status: options.taxStatus || 'taxable',
        tax_class: options.taxClass || '',
      });
      return this.mapProduct(response.data);
    } catch (error) {
      throw new Error(`Failed to create product: ${error}`);
    }
  }

  /**
   * List products
   */
  async listProducts(options?: {
    limit?: number;
    offset?: number;
    status?: string;
    orderby?: string;
    category?: number;
  }): Promise<Product[]> {
    try {
      const response = await this.client.get('products', {
        params: {
          per_page: options?.limit || 10,
          page: (options?.offset || 0) / (options?.limit || 10) + 1,
          status: options?.status || 'publish',
          orderby: options?.orderby || 'date',
          order: 'desc',
          category: options?.category,
        },
      });
      return response.data.map((p: any) => this.mapProduct(p));
    } catch (error) {
      throw new Error(`Failed to list products: ${error}`);
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(id: number): Promise<Product> {
    try {
      const response = await this.client.get(`products/${id}`);
      return this.mapProduct(response.data);
    } catch (error) {
      throw new Error(`Failed to get product: ${error}`);
    }
  }

  /**
   * Update product
   */
  async updateProduct(id: number, updates: Partial<CreateProductOptions>): Promise<Product> {
    try {
      const data: any = {};
      if (updates.name) data.name = updates.name;
      if (updates.price) data.regular_price = String(updates.price);
      if (updates.description) data.description = updates.description;
      if (updates.stock !== undefined) data.stock_quantity = updates.stock;
      if (updates.sku) data.sku = updates.sku;

      const response = await this.client.post(`products/${id}`, data);
      return this.mapProduct(response.data);
    } catch (error) {
      throw new Error(`Failed to update product: ${error}`);
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: number): Promise<void> {
    try {
      await this.client.delete(`products/${id}`, { params: { force: true } });
    } catch (error) {
      throw new Error(`Failed to delete product: ${error}`);
    }
  }

  /**
   * List orders
   */
  async listOrders(options?: {
    limit?: number;
    status?: string;
    customer?: number;
    orderby?: string;
  }): Promise<Order[]> {
    try {
      const response = await this.client.get('orders', {
        params: {
          per_page: options?.limit || 10,
          status: options?.status || 'any',
          customer: options?.customer,
          orderby: options?.orderby || 'date',
          order: 'desc',
        },
      });
      return response.data.map((o: any) => this.mapOrder(o));
    } catch (error) {
      throw new Error(`Failed to list orders: ${error}`);
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(id: number): Promise<Order> {
    try {
      const response = await this.client.get(`orders/${id}`);
      return this.mapOrder(response.data);
    } catch (error) {
      throw new Error(`Failed to get order: ${error}`);
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(id: number, status: string): Promise<Order> {
    try {
      const response = await this.client.post(`orders/${id}`, { status });
      return this.mapOrder(response.data);
    } catch (error) {
      throw new Error(`Failed to update order status: ${error}`);
    }
  }

  /**
   * List customers
   */
  async listCustomers(options?: {
    limit?: number;
    search?: string;
    orderby?: string;
  }): Promise<Customer[]> {
    try {
      const response = await this.client.get('customers', {
        params: {
          per_page: options?.limit || 10,
          search: options?.search,
          orderby: options?.orderby || 'name',
        },
      });
      return response.data.map((c: any) => this.mapCustomer(c));
    } catch (error) {
      throw new Error(`Failed to list customers: ${error}`);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(id: number): Promise<Customer> {
    try {
      const response = await this.client.get(`customers/${id}`);
      return this.mapCustomer(response.data);
    } catch (error) {
      throw new Error(`Failed to get customer: ${error}`);
    }
  }

  /**
   * Create customer
   */
  async createCustomer(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    password?: string;
    billingAddress?: any;
    shippingAddress?: any;
  }): Promise<Customer> {
    try {
      const response = await this.client.post('customers', {
        email: data.email,
        first_name: data.firstName || '',
        last_name: data.lastName || '',
        username: data.username || data.email,
        password: data.password,
        billing: data.billingAddress,
        shipping: data.shippingAddress,
      });
      return this.mapCustomer(response.data);
    } catch (error) {
      throw new Error(`Failed to create customer: ${error}`);
    }
  }

  /**
   * Get shipping zones
   */
  async getShippingZones(): Promise<ShippingZone[]> {
    try {
      const response = await this.client.get('shipping/zones');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get shipping zones: ${error}`);
    }
  }

  /**
   * Get shipping methods for zone
   */
  async getShippingMethods(zoneId: number): Promise<ShippingMethod[]> {
    try {
      const response = await this.client.get(`shipping/zones/${zoneId}/methods`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get shipping methods: ${error}`);
    }
  }

  /**
   * Process refund
   */
  async processRefund(orderId: number, amount: number, reason: string): Promise<any> {
    try {
      const response = await this.client.post(`orders/${orderId}/refunds`, {
        amount: String(amount),
        reason,
        api_refund: true,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to process refund: ${error}`);
    }
  }

  /**
   * Get sales report
   */
  async getSalesReport(startDate: string, endDate: string): Promise<any> {
    try {
      const orders = await this.listOrders({ limit: 100, status: 'completed' });
      // Simple calculation - in production would use reporting endpoints
      return {
        period: { start: startDate, end: endDate },
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + parseFloat(o.total), 0),
        averageOrderValue:
          orders.reduce((sum, o) => sum + parseFloat(o.total), 0) / orders.length || 0,
        orders,
      };
    } catch (error) {
      throw new Error(`Failed to generate sales report: ${error}`);
    }
  }

  /**
   * Map API product response
   */
  private mapProduct(data: any): Product {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      permalink: data.permalink,
      dateCreated: data.date_created,
      dateModified: data.date_modified,
      type: data.type,
      status: data.status,
      featured: data.featured,
      catalogVisibility: data.catalog_visibility,
      description: data.description,
      shortDescription: data.short_description,
      sku: data.sku,
      price: data.price,
      regularPrice: data.regular_price,
      salePrice: data.sale_price,
      onSale: data.on_sale,
      purchasable: data.purchasable,
      totalSales: data.total_sales,
      virtual: data.virtual,
      downloadable: data.downloadable,
      downloadLimit: data.download_limit,
      downloadExpires: data.download_expiry,
      externalUrl: data.external_url,
      buttonText: data.button_text,
      taxStatus: data.tax_status,
      taxClass: data.tax_class,
      manageStock: data.manage_stock,
      stockQuantity: data.stock_quantity,
      stockStatus: data.stock_status,
      backorders: data.backorders,
      backordersAllowed: data.backorders_allowed,
      backordered: data.backordered,
      weight: data.weight,
      dimensions: data.dimensions,
      shippingRequired: data.shipping_required,
      shippingTaxable: data.shipping_taxable,
      shippingClass: data.shipping_class,
      reviewsAllowed: data.reviews_allowed,
      averageRating: data.average_rating,
      ratingCount: data.rating_count,
      upsellIds: data.upsell_ids,
      crossSellIds: data.cross_sell_ids,
      parentId: data.parent_id,
      purchaseNote: data.purchase_note,
      categories: data.categories,
      tags: data.tags,
      images: data.images,
      attributes: data.attributes,
      defaultAttributes: data.default_attributes,
      variations: data.variations,
      groupedProducts: data.grouped_products,
      menuOrder: data.menu_order,
    };
  }

  /**
   * Map API order response
   */
  private mapOrder(data: any): Order {
    return {
      id: data.id,
      orderNumber: data.number,
      parentId: data.parent_id,
      status: data.status,
      currency: data.currency,
      dateCreated: data.date_created,
      dateModified: data.date_modified,
      discountTotal: data.discount_total,
      discountTax: data.discount_tax,
      shippingTotal: data.shipping_total,
      shippingTax: data.shipping_tax,
      cartTax: data.cart_tax,
      total: data.total,
      totalTax: data.total_tax,
      customerIP: data.customer_ip_address,
      customerUserAgent: data.customer_user_agent,
      customerNote: data.customer_note,
      billingAddress: data.billing,
      shippingAddress: data.shipping,
      paymentMethod: data.payment_method,
      paymentMethodTitle: data.payment_method_title,
      transactionId: data.transaction_id,
      dateCompleted: data.date_completed,
      datePaid: data.date_paid,
      cartHash: data.cart_hash,
      customerId: data.customer_id,
      lineItems: data.line_items,
      taxLines: data.tax_lines,
      shippingLines: data.shipping_lines,
      feeLines: data.fee_lines,
      couponLines: data.coupon_lines,
      refunds: data.refunds,
      setPaid: data.set_paid,
    };
  }

  /**
   * Map API customer response
   */
  private mapCustomer(data: any): Customer {
    return {
      id: data.id,
      dateCreated: data.date_created,
      dateModified: data.date_modified,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      role: data.role,
      username: data.username,
      name: data.name,
      avatarUrl: data.avatar_url,
      billingAddress: data.billing,
      shippingAddress: data.shipping,
      isPayingCustomer: data.is_paying_customer,
      ordersCount: data.orders_count,
      totalSpent: data.total_spent,
      links: data._links,
    };
  }
}
