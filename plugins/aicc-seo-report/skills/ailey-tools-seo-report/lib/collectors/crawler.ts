/**
 * Web crawler and page data collector
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import validator from 'validator';
import type { PageData, ImageData, LinkData, SEOConfig } from '../types.js';

export class WebCrawler {
  private visitedUrls: Set<string> = new Set();
  private baseUrl: string;
  private config: SEOConfig;
  private robotsTxt: any;

  constructor(config: SEOConfig) {
    this.config = config;
    this.baseUrl = new URL(config.url).origin;
  }

  async init(): Promise<void> {
    if (this.config.respectRobots !== false) {
      await this.loadRobotsTxt();
    }
  }

  private async loadRobotsTxt(): Promise<void> {
    try {
      const robotsUrl = `${this.baseUrl}/robots.txt`;
      const response = await axios.get(robotsUrl, { timeout: 10000 });
      this.robotsTxt = robotsParser(robotsUrl, response.data);
    } catch (error) {
      console.warn('Could not load robots.txt');
    }
  }

  async crawlPage(url: string): Promise<PageData | null> {
    if (this.visitedUrls.has(url)) {
      return null;
    }

    if (this.robotsTxt && !this.robotsTxt.isAllowed(url, this.config.userAgent || 'SEO-Analyzer')) {
      console.log(`Skipping ${url} - blocked by robots.txt`);
      return null;
    }

    this.visitedUrls.add(url);

    try {
      const response = await axios.get(url, {
        timeout: this.config.timeout || 30000,
        headers: {
          'User-Agent': this.config.userAgent || 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0)',
        },
      });

      const html = response.data;
      const $ = cheerio.load(html);

      return this.extractPageData($, url);
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
      return null;
    }
  }

  private extractPageData($: cheerio.CheerioAPI, url: string): PageData {
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    
    // Extract headers
    const h1Tags = $('h1').map((_, el) => $(el).text().trim()).get();
    const h2Tags = $('h2').map((_, el) => $(el).text().trim()).get();
    const h3Tags = $('h3').map((_, el) => $(el).text().trim()).get();
    const h4Tags = $('h4').map((_, el) => $(el).text().trim()).get();
    const h5Tags = $('h5').map((_, el) => $(el).text().trim()).get();
    const h6Tags = $('h6').map((_, el) => $(el).text().trim()).get();

    // Extract meta tags
    const canonicalUrl = $('link[rel="canonical"]').attr('href');
    const metaRobots = $('meta[name="robots"]').attr('content');
    const languageCode = $('html').attr('lang');
    const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content');
    const viewport = $('meta[name="viewport"]').attr('content');

    // Extract OpenGraph tags
    const openGraphTags: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const property = $(el).attr('property')?.replace('og:', '') || '';
      const content = $(el).attr('content') || '';
      if (property && content) {
        openGraphTags[property] = content;
      }
    });

    // Extract Twitter Card tags
    const twitterCardTags: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name')?.replace('twitter:', '') || '';
      const content = $(el).attr('content') || '';
      if (name && content) {
        twitterCardTags[name] = content;
      }
    });

    // Extract schema markup
    const schemaMarkup: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonData = $(el).html();
        if (jsonData) {
          schemaMarkup.push(JSON.parse(jsonData));
        }
      } catch (e) {
        console.warn('Invalid schema markup found');
      }
    });

    // Extract images
    const images = this.extractImages($, url);

    // Extract links
    const links = this.extractLinks($, url);

    // Extract content
    const content = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = content.split(/\s+/).length;

    return {
      url,
      title,
      metaDescription,
      h1Tags,
      h2Tags,
      h3Tags,
      h4Tags,
      h5Tags,
      h6Tags,
      canonicalUrl,
      metaRobots,
      openGraphTags,
      twitterCardTags,
      schemaMarkup,
      images,
      links,
      content,
      wordCount,
      languageCode,
      charset,
      viewport,
    };
  }

  private extractImages($: cheerio.CheerioAPI, baseUrl: string): ImageData[] {
    const images: ImageData[] = [];
    
    $('img').each((_, el) => {
      const $img = $(el);
      const src = $img.attr('src');
      
      if (src) {
        images.push({
          src: this.resolveUrl(src, baseUrl),
          alt: $img.attr('alt'),
          title: $img.attr('title'),
          width: parseInt($img.attr('width') || '0'),
          height: parseInt($img.attr('height') || '0'),
          loading: $img.attr('loading') as 'lazy' | 'eager' | undefined,
        });
      }
    });

    return images;
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): LinkData[] {
    const links: LinkData[] = [];
    
    $('a[href]').each((_, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      
      if (href) {
        const resolvedUrl = this.resolveUrl(href, baseUrl);
        const isInternal = this.isInternalLink(resolvedUrl, baseUrl);
        const rel = $link.attr('rel') || '';
        const isNoFollow = rel.includes('nofollow');

        links.push({
          href: resolvedUrl,
          text: $link.text().trim(),
          rel,
          target: $link.attr('target'),
          isInternal,
          isNoFollow,
          anchor: $link.text().trim(),
        });
      }
    });

    return links;
  }

  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  private isInternalLink(url: string, baseUrl: string): boolean {
    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(baseUrl);
      return urlObj.hostname === baseUrlObj.hostname;
    } catch {
      return false;
    }
  }

  async crawlSite(maxPages: number = 50): Promise<PageData[]> {
    const pages: PageData[] = [];
    const queue: string[] = [this.config.url];
    
    while (queue.length > 0 && pages.length < maxPages) {
      const url = queue.shift()!;
      const pageData = await this.crawlPage(url);
      
      if (pageData) {
        pages.push(pageData);
        
        // Add internal links to queue
        const internalLinks = pageData.links
          .filter(link => link.isInternal && !this.visitedUrls.has(link.href))
          .map(link => link.href)
          .slice(0, 10); // Limit new URLs per page
        
        queue.push(...internalLinks);
      }
    }

    return pages;
  }
}
