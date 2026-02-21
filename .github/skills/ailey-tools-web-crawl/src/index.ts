import puppeteer, { Browser, Page } from 'puppeteer';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import PQueue from 'p-queue';
import UrlPattern from 'url-pattern';
import * as fs from 'fs/promises';
import * as path from 'path';
import { URL } from 'url';
import mime from 'mime-types';
import RobotsParser from 'robots-parser';
import { EventEmitter } from 'events';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

export interface CrawlerConfig {
  // Required
  startUrl: string;
  outputDir?: string;

  // Depth and limits
  maxDepth?: number;
  maxPages?: number;
  maxDuration?: number; // minutes
  maxFileSize?: number; // MB
  maxTotalSize?: number; // MB

  // Cross-site
  allowCrossSite?: boolean;
  allowedDomains?: string[];

  // Parallelization
  maxConcurrent?: number;
  requestDelay?: number; // ms
  retryAttempts?: number;
  retryDelay?: number; // ms
  retryOn?: number[]; // HTTP status codes

  // Filtering
  includePatterns?: string[];
  excludePatterns?: string[];
  allowedFileTypes?: string[];
  customFilter?: (url: string) => boolean;

  // Binaries
  downloadBinaries?: boolean;
  binaryExtensions?: string[];

  // Browser
  browser?: {
    headless?: boolean;
    userAgent?: string;
    viewport?: { width: number; height: number };
    javascriptEnabled?: boolean;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    timeout?: number;
    navigationTimeout?: number;
    headers?: Record<string, string>;
  };

  // Authentication
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'form' | 'cookie';
    username?: string;
    password?: string;
    token?: string;
    loginUrl?: string;
    usernameField?: string;
    passwordField?: string;
    submitSelector?: string;
    successUrl?: string;
    cookies?: Array<{
      name: string;
      value: string;
      domain?: string;
      path?: string;
      httpOnly?: boolean;
      secure?: boolean;
    }>;
  };

  // Robots.txt
  respectRobotsTxt?: boolean;
  minCrawlDelay?: number;

  // Output
  saveHtml?: boolean;
  saveMetadata?: boolean;
  saveScreenshots?: boolean;
  screenshotFormat?: 'png' | 'jpeg';
  screenshotQuality?: number;
  compressOutput?: boolean;

  // Logging
  verbose?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface CrawlStats {
  pagesVisited: number;
  pagesQueued: number;
  filesDownloaded: number;
  totalSizeMB: number;
  elapsedMinutes: number;
  pagesPerMinute: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

export interface PageMetadata {
  url: string;
  title: string;
  depth: number;
  timestamp: string;
  statusCode: number;
  contentType: string;
  size: number;
  links: string[];
  images: string[];
}

interface QueueItem {
  url: string;
  depth: number;
  sourceUrl: string;
}

export class WebCrawler extends EventEmitter {
  private config: Required<CrawlerConfig>;
  private queue: PQueue;
  private visited = new Set<string>();
  private queued = new Set<string>();
  private browser?: Browser;
  private axiosClient: AxiosInstance;
  private robots?: any;
  private stats: CrawlStats;
  private startTime: Date;
  private running = false;
  private paused = false;
  private totalSizeBytes = 0;

  // Compiled patterns
  private includePatterns: UrlPattern[];
  private excludePatterns: UrlPattern[];

  constructor(config: CrawlerConfig) {
    super();

    // Set defaults
    this.config = {
      startUrl: config.startUrl,
      outputDir: config.outputDir || './crawled',
      maxDepth: config.maxDepth ?? 3,
      maxPages: config.maxPages ?? 1000,
      maxDuration: config.maxDuration ?? 60,
      maxFileSize: config.maxFileSize ?? 100,
      maxTotalSize: config.maxTotalSize ?? 10000,
      allowCrossSite: config.allowCrossSite ?? false,
      allowedDomains: config.allowedDomains || [],
      maxConcurrent: config.maxConcurrent ?? 5,
      requestDelay: config.requestDelay ?? 1000,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 2000,
      retryOn: config.retryOn || [408, 429, 500, 502, 503, 504],
      includePatterns: config.includePatterns || [],
      excludePatterns: config.excludePatterns || [],
      allowedFileTypes: config.allowedFileTypes || ['html', 'htm'],
      customFilter: config.customFilter,
      downloadBinaries: config.downloadBinaries ?? false,
      binaryExtensions: config.binaryExtensions || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'mp4', 'mp3'],
      browser: {
        headless: config.browser?.headless ?? true,
        userAgent: config.browser?.userAgent || 'Mozilla/5.0 (compatible; AIleyBot/1.0)',
        viewport: config.browser?.viewport || { width: 1920, height: 1080 },
        javascriptEnabled: config.browser?.javascriptEnabled ?? true,
        waitUntil: config.browser?.waitUntil || 'networkidle2',
        timeout: config.browser?.timeout ?? 30000,
        navigationTimeout: config.browser?.navigationTimeout ?? 60000,
        headers: config.browser?.headers || {},
      },
      authentication: config.authentication || { type: 'none' },
      respectRobotsTxt: config.respectRobotsTxt ?? true,
      minCrawlDelay: config.minCrawlDelay ?? 0,
      saveHtml: config.saveHtml ?? true,
      saveMetadata: config.saveMetadata ?? true,
      saveScreenshots: config.saveScreenshots ?? false,
      screenshotFormat: config.screenshotFormat || 'png',
      screenshotQuality: config.screenshotQuality ?? 90,
      compressOutput: config.compressOutput ?? false,
      verbose: config.verbose ?? false,
      logLevel: config.logLevel || 'info',
    } as Required<CrawlerConfig>;

    // Compile patterns
    this.includePatterns = this.config.includePatterns.map(p => new UrlPattern(p));
    this.excludePatterns = this.config.excludePatterns.map(p => new UrlPattern(p));

    // Initialize queue
    this.queue = new PQueue({
      concurrency: this.config.maxConcurrent,
      interval: this.config.requestDelay,
      intervalCap: 1,
    });

    // Initialize axios
    this.axiosClient = axios.create({
      timeout: this.config.browser.timeout,
      maxRedirects: 5,
      validateStatus: () => true, // Don't throw on any status
    });

    // Initialize stats
    this.startTime = new Date();
    this.stats = {
      pagesVisited: 0,
      pagesQueued: 0,
      filesDownloaded: 0,
      totalSizeMB: 0,
      elapsedMinutes: 0,
      pagesPerMinute: 0,
      errors: 0,
      startTime: this.startTime,
    };
  }

  async start(): Promise<CrawlStats> {
    this.running = true;
    this.log('info', `Starting crawl of ${this.config.startUrl}`);

    try {
      // Create output directory
      await fs.mkdir(this.config.outputDir, { recursive: true });

      // Load robots.txt
      if (this.config.respectRobotsTxt) {
        await this.loadRobotsTxt();
      }

      // Authenticate if needed
      if (this.config.authentication.type !== 'none') {
        await this.authenticate();
      }

      // Start crawling
      await this.enqueueUrl(this.config.startUrl, 0, this.config.startUrl);
      await this.queue.onIdle();

      // Complete
      this.stats.endTime = new Date();
      this.stats.elapsedMinutes = (this.stats.endTime.getTime() - this.startTime.getTime()) / 60000;
      this.stats.pagesPerMinute = this.stats.pagesVisited / this.stats.elapsedMinutes;

      this.log('info', `Crawl complete: ${this.stats.pagesVisited} pages in ${this.stats.elapsedMinutes.toFixed(2)} minutes`);
      this.emit('complete', this.stats);

      return this.stats;
    } catch (error) {
      this.log('error', `Crawl failed: ${error}`);
      throw error;
    } finally {
      await this.cleanup();
      this.running = false;
    }
  }

  pause(): void {
    if (this.running && !this.paused) {
      this.queue.pause();
      this.paused = true;
      this.log('info', 'Crawl paused');
      this.emit('paused');
    }
  }

  resume(): void {
    if (this.running && this.paused) {
      this.queue.start();
      this.paused = false;
      this.log('info', 'Crawl resumed');
      this.emit('resumed');
    }
  }

  stop(): void {
    if (this.running) {
      this.queue.clear();
      this.running = false;
      this.log('info', 'Crawl stopped');
      this.emit('stopped');
    }
  }

  getStats(): CrawlStats {
    const now = new Date();
    const elapsed = (now.getTime() - this.startTime.getTime()) / 60000;
    return {
      ...this.stats,
      elapsedMinutes: elapsed,
      pagesPerMinute: this.stats.pagesVisited / elapsed,
      totalSizeMB: this.totalSizeBytes / (1024 * 1024),
    };
  }

  isRunning(): boolean {
    return this.running;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getVisitedUrls(): string[] {
    return Array.from(this.visited);
  }

  private async enqueueUrl(url: string, depth: number, sourceUrl: string): Promise<void> {
    // Check if already visited or queued
    if (this.visited.has(url) || this.queued.has(url)) {
      return;
    }

    // Check depth limit
    if (depth > this.config.maxDepth) {
      return;
    }

    // Check page limit
    if (this.stats.pagesVisited >= this.config.maxPages) {
      return;
    }

    // Check duration limit
    const elapsed = (new Date().getTime() - this.startTime.getTime()) / 60000;
    if (elapsed >= this.config.maxDuration) {
      this.log('warn', `Max duration ${this.config.maxDuration} minutes reached`);
      this.stop();
      return;
    }

    // Check total size limit
    if (this.totalSizeBytes / (1024 * 1024) >= this.config.maxTotalSize) {
      this.log('warn', `Max total size ${this.config.maxTotalSize} MB reached`);
      this.stop();
      return;
    }

    // Check filters
    if (!this.shouldCrawl(url)) {
      return;
    }

    // Add to queue
    this.queued.add(url);
    this.stats.pagesQueued++;
    this.emit('link-discovered', url, sourceUrl);

    this.queue.add(async () => {
      if (!this.running) return;
      await this.crawlUrl(url, depth);
    });
  }

  private async crawlUrl(url: string, depth: number): Promise<void> {
    try {
      this.log('debug', `Crawling ${url} (depth ${depth})`);

      // Check robots.txt
      if (this.robots && !this.robots.isAllowed(url, this.config.browser.userAgent)) {
        this.log('debug', `Skipping ${url} (disallowed by robots.txt)`);
        return;
      }

      // Mark as visited
      this.visited.add(url);
      this.stats.pagesVisited++;

      // Crawl based on file type
      const urlObj = new URL(url);
      const ext = path.extname(urlObj.pathname).slice(1).toLowerCase();
      const isBinary = this.config.binaryExtensions.includes(ext);

      if (isBinary && !this.config.downloadBinaries) {
        this.log('debug', `Skipping binary ${url}`);
        return;
      }

      let content: string | Buffer;
      let statusCode: number;
      let contentType: string;
      let links: string[] = [];
      let images: string[] = [];

      if (this.config.browser.javascriptEnabled && !isBinary) {
        // Use Puppeteer for JS-heavy pages
        const result = await this.crawlWithPuppeteer(url);
        content = result.content;
        statusCode = result.statusCode;
        contentType = result.contentType;
        links = result.links;
        images = result.images;
      } else {
        // Use axios for static pages or binaries
        const result = await this.crawlWithAxios(url);
        content = result.content;
        statusCode = result.statusCode;
        contentType = result.contentType;

        // Extract links from HTML
        if (!isBinary && typeof content === 'string') {
          const $ = cheerio.load(content);
          links = this.extractLinks($, url);
          images = this.extractImages($, url);
        }
      }

      // Save content
      if (statusCode >= 200 && statusCode < 300) {
        await this.saveContent(url, content, depth, statusCode, contentType, links, images);

        // Enqueue links
        if (!isBinary && depth < this.config.maxDepth) {
          for (const link of links) {
            await this.enqueueUrl(link, depth + 1, url);
          }
        }

        this.emit('page-crawled', url, depth);
      } else {
        this.log('warn', `HTTP ${statusCode} for ${url}`);
        this.emit('page-error', url, statusCode);
      }
    } catch (error: any) {
      this.stats.errors++;
      this.log('error', `Error crawling ${url}: ${error.message}`);
      this.emit('error', error, url, { depth });

      // Retry logic
      if (this.shouldRetry(error)) {
        await this.delay(this.config.retryDelay);
        await this.crawlUrl(url, depth);
      }
    }
  }

  private async crawlWithPuppeteer(url: string): Promise<{
    content: string;
    statusCode: number;
    contentType: string;
    links: string[];
    images: string[];
  }> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.config.browser.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page = await this.browser.newPage();

    try {
      // Set user agent
      await page.setUserAgent(this.config.browser.userAgent!);

      // Set viewport
      await page.setViewport(this.config.browser.viewport!);

      // Set extra headers
      if (Object.keys(this.config.browser.headers!).length > 0) {
        await page.setExtraHTTPHeaders(this.config.browser.headers!);
      }

      // Set cookies
      if (this.config.authentication.type === 'cookie' && this.config.authentication.cookies) {
        await page.setCookie(...this.config.authentication.cookies);
      }

      // Navigate
      const response = await page.goto(url, {
        waitUntil: this.config.browser.waitUntil,
        timeout: this.config.browser.navigationTimeout,
      });

      const statusCode = response?.status() || 0;
      const contentType = response?.headers()['content-type'] || 'text/html';

      // Get content
      const content = await page.content();

      // Extract links
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors.map(a => (a as HTMLAnchorElement).href);
      });

      // Extract images
      const images = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img[src]'));
        return imgs.map(img => (img as HTMLImageElement).src);
      });

      // Screenshot if enabled
      if (this.config.saveScreenshots) {
        const screenshotPath = this.getFilePath(url, this.config.screenshotFormat!);
        await page.screenshot({
          path: screenshotPath,
          type: this.config.screenshotFormat,
          quality: this.config.screenshotFormat === 'jpeg' ? this.config.screenshotQuality : undefined,
          fullPage: true,
        });
      }

      return {
        content,
        statusCode,
        contentType,
        links: links.filter(link => this.isValidUrl(link)),
        images: images.filter(img => this.isValidUrl(img)),
      };
    } finally {
      await page.close();
    }
  }

  private async crawlWithAxios(url: string): Promise<{
    content: string | Buffer;
    statusCode: number;
    contentType: string;
  }> {
    const headers: Record<string, string> = {
      'User-Agent': this.config.browser.userAgent!,
      ...this.config.browser.headers,
    };

    // Add authentication
    if (this.config.authentication.type === 'basic') {
      const auth = Buffer.from(
        `${this.config.authentication.username}:${this.config.authentication.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else if (this.config.authentication.type === 'bearer') {
      headers['Authorization'] = `Bearer ${this.config.authentication.token}`;
    }

    const response = await this.axiosClient.get(url, {
      headers,
      responseType: 'arraybuffer', // Get raw bytes
    });

    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const isBinary = !contentType.includes('text') && !contentType.includes('json') && !contentType.includes('xml');

    return {
      content: isBinary ? response.data : response.data.toString('utf-8'),
      statusCode: response.status,
      contentType,
    };
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    $('a[href]').each((_, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        const absoluteUrl = this.resolveUrl(href, baseUrl);
        if (absoluteUrl && this.isValidUrl(absoluteUrl)) {
          links.push(absoluteUrl);
        }
      }
    });
    return [...new Set(links)];
  }

  private extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = [];
    $('img[src]').each((_, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        const absoluteUrl = this.resolveUrl(src, baseUrl);
        if (absoluteUrl && this.isValidUrl(absoluteUrl)) {
          images.push(absoluteUrl);
        }
      }
    });
    return [...new Set(images)];
  }

  private async saveContent(
    url: string,
    content: string | Buffer,
    depth: number,
    statusCode: number,
    contentType: string,
    links: string[],
    images: string[]
  ): Promise<void> {
    const filePath = this.getFilePath(url, 'html');
    const fileDir = path.dirname(filePath);

    // Create directory
    await fs.mkdir(fileDir, { recursive: true });

    // Check file size
    const sizeBytes = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf-8');
    const sizeMB = sizeBytes / (1024 * 1024);

    if (sizeMB > this.config.maxFileSize) {
      this.log('warn', `Skipping ${url} (size ${sizeMB.toFixed(2)} MB exceeds limit)`);
      return;
    }

    this.totalSizeBytes += sizeBytes;
    this.stats.filesDownloaded++;

    // Save HTML
    if (this.config.saveHtml) {
      let dataToSave = content;
      if (this.config.compressOutput && typeof content === 'string') {
        dataToSave = await gzip(Buffer.from(content, 'utf-8'));
        await fs.writeFile(filePath + '.gz', dataToSave);
      } else {
        await fs.writeFile(filePath, content);
      }
    }

    // Save metadata
    if (this.config.saveMetadata) {
      const metadata: PageMetadata = {
        url,
        title: this.extractTitle(content),
        depth,
        timestamp: new Date().toISOString(),
        statusCode,
        contentType,
        size: sizeBytes,
        links,
        images,
      };

      const metadataPath = filePath.replace(/\.[^.]+$/, '.meta.json');
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    this.emit('file-downloaded', url, filePath, sizeMB);
  }

  private extractTitle(content: string | Buffer): string {
    if (Buffer.isBuffer(content)) return '';

    const $ = cheerio.load(content);
    return $('title').text() || '';
  }

  private getFilePath(url: string, ext: string): string {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname === '/' ? '/index' : urlObj.pathname;

    // Remove extension if exists
    const cleanPath = pathname.replace(/\.[^.]+$/, '');

    // Create safe file path
    const safePath = cleanPath.replace(/[^a-zA-Z0-9/-]/g, '_');
    const fullPath = path.join(this.config.outputDir, hostname, safePath + '.' + ext);

    return fullPath;
  }

  private shouldCrawl(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // Check cross-site
      if (!this.config.allowCrossSite) {
        const startUrlObj = new URL(this.config.startUrl);
        if (urlObj.hostname !== startUrlObj.hostname) {
          return false;
        }
      }

      // Check allowed domains
      if (this.config.allowedDomains.length > 0) {
        if (!this.config.allowedDomains.some(domain => urlObj.hostname.endsWith(domain))) {
          return false;
        }
      }

      // Check include patterns
      if (this.includePatterns.length > 0) {
        if (!this.includePatterns.some(pattern => pattern.match(urlObj.pathname))) {
          return false;
        }
      }

      // Check exclude patterns
      if (this.excludePatterns.length > 0) {
        if (this.excludePatterns.some(pattern => pattern.match(urlObj.pathname))) {
          return false;
        }
      }

      // Check file types
      const ext = path.extname(urlObj.pathname).slice(1).toLowerCase();
      if (ext && !this.config.allowedFileTypes.includes(ext) && !this.config.binaryExtensions.includes(ext)) {
        return false;
      }

      // Check custom filter
      if (this.config.customFilter && !this.config.customFilter(url)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private resolveUrl(href: string, baseUrl: string): string | null {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return null;
    }
  }

  private async loadRobotsTxt(): Promise<void> {
    try {
      const urlObj = new URL(this.config.startUrl);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

      const response = await this.axiosClient.get(robotsUrl);
      if (response.status === 200) {
        this.robots = new (RobotsParser as any)(robotsUrl, response.data);
        this.log('info', 'Loaded robots.txt');

        // Apply crawl delay
        const crawlDelay = this.robots.getCrawlDelay(this.config.browser.userAgent) * 1000;
        if (crawlDelay > this.config.requestDelay) {
          this.config.requestDelay = Math.max(crawlDelay, this.config.minCrawlDelay);
          this.log('info', `Applied robots.txt crawl delay: ${this.config.requestDelay}ms`);
        }
      }
    } catch (error) {
      this.log('debug', 'No robots.txt found or error loading');
    }
  }

  private async authenticate(): Promise<void> {
    const auth = this.config.authentication;

    if (auth.type === 'form') {
      // Form-based authentication with Puppeteer
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: this.config.browser.headless,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      }

      const page = await this.browser.newPage();

      try {
        await page.goto(auth.loginUrl!, { waitUntil: 'networkidle2' });

        // Fill form
        await page.type(auth.usernameField!, auth.username!);
        await page.type(auth.passwordField!, auth.password!);

        // Submit
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          page.click(auth.submitSelector!),
        ]);

        this.log('info', 'Authenticated successfully');
      } finally {
        await page.close();
      }
    }
  }

  private shouldRetry(error: any): boolean {
    // Implement retry logic based on error type
    return false; // Simplified for now
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(level: string, message: string): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);

    if (messageLevel >= currentLevel) {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  }

  async generateSitemap(outputPath: string): Promise<void> {
    const urls = this.getVisitedUrls();
    const sitemap = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(url => `  <url><loc>${url}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`),
      '</urlset>',
    ].join('\n');

    await fs.writeFile(outputPath, sitemap);
    this.log('info', `Generated sitemap: ${outputPath}`);
  }

  async exportLinks(outputPath: string): Promise<void> {
    const urls = this.getVisitedUrls();
    await fs.writeFile(outputPath, JSON.stringify(urls, null, 2));
    this.log('info', `Exported links: ${outputPath}`);
  }
}
