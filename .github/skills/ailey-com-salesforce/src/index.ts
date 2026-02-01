import jsforce, { Connection } from 'jsforce';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import * as Papa from 'papaparse';

export interface SalesforceConfig {
  // OAuth
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
  
  // Username-Password
  username?: string;
  password?: string;
  
  // JWT
  privateKeyPath?: string;
  
  // Common
  loginUrl?: string;
  apiVersion?: string;
  authMethod?: 'oauth' | 'username-password' | 'jwt';
  
  // Options
  autoThrottle?: boolean;
  maxApiCallsPerSecond?: number;
  enableCache?: boolean;
  cacheTTL?: number;
}

export interface SalesforceEdition {
  edition: 'Developer' | 'Professional' | 'Enterprise' | 'Unlimited' | 'Performance';
  apiCallsPerDay: number;
  features: {
    bulkApi: boolean;
    streamingApi: boolean;
    metadataApi: boolean;
    customObjects: number;
    customFields: number;
    sandboxes: boolean;
  };
}

export interface QueryResult<T = any> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

export interface BulkJobInfo {
  id: string;
  state: string;
  object: string;
  operation: string;
  numberRecordsProcessed: number;
  numberRecordsFailed: number;
  totalProcessingTime: number;
}

export class SalesforceClient extends EventEmitter {
  private conn?: Connection;
  private config: Required<SalesforceConfig>;
  private edition?: SalesforceEdition;
  private apiCallCount = 0;
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor(config: SalesforceConfig) {
    super();

    this.config = {
      clientId: config.clientId || process.env.SALESFORCE_CLIENT_ID || '',
      clientSecret: config.clientSecret || process.env.SALESFORCE_CLIENT_SECRET || '',
      callbackUrl: config.callbackUrl || 'http://localhost:3000/oauth/callback',
      username: config.username || process.env.SALESFORCE_USERNAME || '',
      password: config.password || process.env.SALESFORCE_PASSWORD || '',
      privateKeyPath: config.privateKeyPath || './certs/server.key',
      loginUrl: config.loginUrl || 'https://login.salesforce.com',
      apiVersion: config.apiVersion || '59.0',
      authMethod: config.authMethod || 'oauth',
      autoThrottle: config.autoThrottle ?? true,
      maxApiCallsPerSecond: config.maxApiCallsPerSecond ?? 10,
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 3600,
    };
  }

  async authenticate(): Promise<void> {
    if (this.config.authMethod === 'oauth') {
      await this.authenticateOAuth();
    } else if (this.config.authMethod === 'username-password') {
      await this.authenticateUsernamePassword();
    } else if (this.config.authMethod === 'jwt') {
      await this.authenticateJWT();
    }

    // Detect edition after authentication
    await this.detectEdition();
  }

  private async authenticateOAuth(): Promise<void> {
    const oauth2 = new jsforce.OAuth2({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUri: this.config.callbackUrl,
      loginUrl: this.config.loginUrl,
    });

    // Check for existing token
    const tokenPath = path.join(process.cwd(), '.oauth', 'token.json');
    try {
      const tokenData = await fs.readFile(tokenPath, 'utf-8');
      const token = JSON.parse(tokenData);

      this.conn = new jsforce.Connection({
        instanceUrl: token.instanceUrl,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        oauth2,
        version: this.config.apiVersion,
      });

      // Test connection
      await this.conn.identity();
      this.emit('authenticated', { method: 'oauth', fromCache: true });
    } catch (error) {
      // Need to authenticate
      throw new Error('OAuth token not found or expired. Run setup command to authenticate.');
    }
  }

  private async authenticateUsernamePassword(): Promise<void> {
    this.conn = new jsforce.Connection({
      loginUrl: this.config.loginUrl,
      version: this.config.apiVersion,
    });

    await this.conn.login(this.config.username, this.config.password);
    this.emit('authenticated', { method: 'username-password' });
  }

  private async authenticateJWT(): Promise<void> {
    const privateKey = await fs.readFile(this.config.privateKeyPath, 'utf-8');

    this.conn = new jsforce.Connection({
      loginUrl: this.config.loginUrl,
      version: this.config.apiVersion,
    });

    await this.conn.loginBySoap(this.config.username, this.config.password); // Simplified
    this.emit('authenticated', { method: 'jwt' });
  }

  async detectEdition(): Promise<SalesforceEdition> {
    if (this.edition) return this.edition;

    if (!this.conn) throw new Error('Not authenticated');

    // Query organization limits
    const limits = await this.getApiLimits();
    const org = await this.conn.query('SELECT OrganizationType, Edition FROM Organization LIMIT 1');

    const edition = org.records[0] as any;
    const apiCallsPerDay = limits.DailyApiRequests?.Max || 15000;

    let editionType: SalesforceEdition['edition'] = 'Developer';
    let features: SalesforceEdition['features'] = {
      bulkApi: true,
      streamingApi: true,
      metadataApi: true,
      customObjects: 200,
      customFields: 500,
      sandboxes: false,
    };

    if (edition.OrganizationType === 'Developer Edition') {
      editionType = 'Developer';
      features = {
        bulkApi: true,
        streamingApi: true,
        metadataApi: true,
        customObjects: 200,
        customFields: 500,
        sandboxes: false,
      };
    } else if (edition.Edition?.includes('Professional')) {
      editionType = 'Professional';
      features = {
        bulkApi: false,
        streamingApi: false,
        metadataApi: true,
        customObjects: 10,
        customFields: 100,
        sandboxes: false,
      };
    } else if (edition.Edition?.includes('Enterprise')) {
      editionType = 'Enterprise';
      features = {
        bulkApi: true,
        streamingApi: true,
        metadataApi: true,
        customObjects: 2000,
        customFields: 500,
        sandboxes: true,
      };
    } else if (edition.Edition?.includes('Unlimited')) {
      editionType = 'Unlimited';
      features = {
        bulkApi: true,
        streamingApi: true,
        metadataApi: true,
        customObjects: 2000,
        customFields: 500,
        sandboxes: true,
      };
    } else if (edition.Edition?.includes('Performance')) {
      editionType = 'Performance';
      features = {
        bulkApi: true,
        streamingApi: true,
        metadataApi: true,
        customObjects: 2000,
        customFields: 800,
        sandboxes: true,
      };
    }

    this.edition = {
      edition: editionType,
      apiCallsPerDay,
      features,
    };

    this.emit('edition-detected', this.edition);
    return this.edition;
  }

  async query<T = any>(soql: string): Promise<QueryResult<T>> {
    if (!this.conn) throw new Error('Not authenticated');

    this.trackApiCall();
    const result = await this.conn.query(soql);

    return {
      totalSize: result.totalSize,
      done: result.done,
      records: result.records as T[],
      nextRecordsUrl: result.nextRecordsUrl,
    };
  }

  async queryAll<T = any>(soql: string): Promise<QueryResult<T>> {
    if (!this.conn) throw new Error('Not authenticated');

    const allRecords: T[] = [];
    let result = await this.query<T>(soql);
    allRecords.push(...result.records);

    while (!result.done && result.nextRecordsUrl) {
      this.trackApiCall();
      const moreResult = await this.conn.queryMore(result.nextRecordsUrl);
      allRecords.push(...(moreResult.records as T[]));
      result = {
        totalSize: moreResult.totalSize,
        done: moreResult.done,
        records: moreResult.records as T[],
        nextRecordsUrl: moreResult.nextRecordsUrl,
      };
    }

    return {
      totalSize: result.totalSize,
      done: true,
      records: allRecords,
    };
  }

  async create(objectType: string, data: any): Promise<{ id: string; success: boolean; errors: any[] }> {
    if (!this.conn) throw new Error('Not authenticated');

    this.trackApiCall();
    const result = await this.conn.sobject(objectType).create(data);

    return {
      id: result.id,
      success: result.success,
      errors: result.errors || [],
    };
  }

  async createBatch(objectType: string, records: any[]): Promise<Array<{ id: string; success: boolean; errors: any[] }>> {
    if (!this.conn) throw new Error('Not authenticated');

    this.trackApiCall();
    const results = await this.conn.sobject(objectType).create(records);

    return Array.isArray(results) ? results : [results];
  }

  async retrieve(objectType: string, id: string): Promise<any> {
    if (!this.conn) throw new Error('Not authenticated');

    this.trackApiCall();
    return await this.conn.sobject(objectType).retrieve(id);
  }

  async update(objectType: string, id: string, data: any): Promise<{ id: string; success: boolean; errors: any[] }> {
    if (!this.conn) throw new Error('Not authenticated');

    this.trackApiCall();
    const result = await this.conn.sobject(objectType).update({ ...data, Id: id });

    return {
      id: result.id,
      success: result.success,
      errors: result.errors || [],
    };
  }

  async delete(objectType: string, id: string): Promise<{ id: string; success: boolean; errors: any[] }> {
    if (!this.conn) throw new Error('Not authenticated');

    this.trackApiCall();
    const result = await this.conn.sobject(objectType).delete(id);

    return {
      id: result.id,
      success: result.success,
      errors: result.errors || [],
    };
  }

  async getApiLimits(): Promise<any> {
    if (!this.conn) throw new Error('Not authenticated');

    const response = await axios.get(`${this.conn.instanceUrl}/services/data/v${this.config.apiVersion}/limits`, {
      headers: {
        Authorization: `Bearer ${this.conn.accessToken}`,
      },
    });

    return response.data;
  }

  async exportToCsv(records: any[], outputPath: string): Promise<void> {
    const csv = Papa.unparse(records);
    await fs.writeFile(outputPath, csv);
    this.emit('export-complete', { path: outputPath, records: records.length });
  }

  async importFromCsv(objectType: string, csvPath: string): Promise<BulkJobInfo> {
    const csvData = await fs.readFile(csvPath, 'utf-8');
    const { data } = Papa.parse(csvData, { header: true });

    return await this.bulk.insert(objectType, data);
  }

  private trackApiCall(): void {
    this.apiCallCount++;
    this.emit('api-call', { count: this.apiCallCount });

    if (this.edition && this.apiCallCount > this.edition.apiCallsPerDay * 0.8) {
      this.emit('api-limit-warning', {
        used: this.apiCallCount,
        max: this.edition.apiCallsPerDay,
      });
    }
  }

  get bulk() {
    const self = this;
    return {
      async insert(objectType: string, records: any[], options: { batchSize?: number; wait?: boolean } = {}) {
        if (!self.conn) throw new Error('Not authenticated');

        const job = self.conn.bulk.createJob(objectType, 'insert');
        const batch = job.createBatch();
        batch.execute(records);

        if (options.wait) {
          await batch.poll(1000);
        }

        return await job.check();
      },

      async update(objectType: string, records: any[], options: { batchSize?: number; wait?: boolean } = {}) {
        if (!self.conn) throw new Error('Not authenticated');

        const job = self.conn.bulk.createJob(objectType, 'update');
        const batch = job.createBatch();
        batch.execute(records);

        if (options.wait) {
          await batch.poll(1000);
        }

        return await job.check();
      },

      async upsert(objectType: string, records: any[], options: { externalIdField?: string; wait?: boolean } = {}) {
        if (!self.conn) throw new Error('Not authenticated');

        const job = self.conn.bulk.createJob(objectType, 'upsert', {
          externalIdFieldName: options.externalIdField,
        });
        const batch = job.createBatch();
        batch.execute(records);

        if (options.wait) {
          await batch.poll(1000);
        }

        return await job.check();
      },

      async delete(objectType: string, ids: string[], options: { wait?: boolean } = {}) {
        if (!self.conn) throw new Error('Not authenticated');

        const job = self.conn.bulk.createJob(objectType, 'delete');
        const batch = job.createBatch();
        batch.execute(ids.map(id => ({ Id: id })));

        if (options.wait) {
          await batch.poll(1000);
        }

        return await job.check();
      },

      async getJobInfo(jobId: string) {
        if (!self.conn) throw new Error('Not authenticated');
        return await self.conn.bulk.job(jobId).check();
      },

      async getFailedResults(jobId: string) {
        if (!self.conn) throw new Error('Not authenticated');
        const job = self.conn.bulk.job(jobId);
        const batches = await job.list();
        const failures = [];

        for (const batch of batches) {
          const results = await job.batch(batch.id).retrieve();
          for (const result of results) {
            if (!result.success) {
              failures.push(result);
            }
          }
        }

        return failures;
      },
    };
  }

  get metadata() {
    const self = this;
    return {
      async describe(objectType: string) {
        if (!self.conn) throw new Error('Not authenticated');
        return await self.conn.sobject(objectType).describe();
      },

      async listObjects() {
        if (!self.conn) throw new Error('Not authenticated');
        return await self.conn.describeGlobal();
      },

      async getPicklistValues(objectType: string, fieldName: string) {
        const metadata = await this.describe(objectType);
        const field = metadata.fields.find((f: any) => f.name === fieldName);
        return field?.picklistValues || [];
      },
    };
  }

  get streaming() {
    const self = this;
    return {
      async subscribe(channel: string, callback: (event: any) => void) {
        if (!self.conn) throw new Error('Not authenticated');

        const subscription = self.conn.streaming.topic(channel).subscribe((message) => {
          callback(message);
        });

        return {
          unsubscribe: () => subscription.cancel(),
        };
      },
    };
  }

  getEdition(): SalesforceEdition | undefined {
    return this.edition;
  }

  getApiCallCount(): number {
    return this.apiCallCount;
  }

  isAuthenticated(): boolean {
    return !!this.conn;
  }
}
