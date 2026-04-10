/**
 * Type definitions for SEO analysis and reporting
 */

export interface SEOConfig {
  url: string;
  competitors?: string[];
  keywords?: string[];
  analysisDepth?: 'basic' | 'standard' | 'deep-dive';
  focus?: 'all' | 'technical' | 'content' | 'performance' | 'authority';
  outputDir?: string;
  maxPages?: number;
  timeout?: number;
  userAgent?: string;
  respectRobots?: boolean;
}

export interface PageData {
  url: string;
  title: string;
  metaDescription: string;
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  h4Tags: string[];
  h5Tags: string[];
  h6Tags: string[];
  canonicalUrl?: string;
  metaRobots?: string;
  openGraphTags: Record<string, string>;
  twitterCardTags: Record<string, string>;
  schemaMarkup: any[];
  images: ImageData[];
  links: LinkData[];
  content: string;
  wordCount: number;
  readabilityScore?: number;
  languageCode?: string;
  charset?: string;
  viewport?: string;
}

export interface ImageData {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  format?: string;
  loading?: 'lazy' | 'eager';
}

export interface LinkData {
  href: string;
  text: string;
  rel?: string;
  target?: string;
  isInternal: boolean;
  isNoFollow: boolean;
  anchor: string;
}

export interface TechnicalSEOData {
  sitemapUrl?: string;
  sitemapValid: boolean;
  sitemapUrls: number;
  robotsTxtExists: boolean;
  robotsTxtValid: boolean;
  robotsDirectives: string[];
  httpsEnabled: boolean;
  wwwRedirect: boolean;
  mobileRedirect: boolean;
  canonicalization: 'proper' | 'issues' | 'missing';
  indexability: 'indexable' | 'blocked' | 'issues';
  crawlErrors: CrawlError[];
  structuredDataErrors: StructuredDataError[];
  brokenLinks: string[];
  redirectChains: RedirectChain[];
  duplicateContent: DuplicateContent[];
}

export interface CrawlError {
  url: string;
  errorType: string;
  statusCode: number;
  message: string;
}

export interface StructuredDataError {
  url: string;
  schemaType: string;
  error: string;
  severity: 'error' | 'warning';
}

export interface RedirectChain {
  startUrl: string;
  endUrl: string;
  redirects: number;
  statusCodes: number[];
}

export interface DuplicateContent {
  url1: string;
  url2: string;
  similarity: number;
  type: 'title' | 'meta-description' | 'content' | 'h1';
}

export interface PerformanceData {
  lighthouse: LighthouseResults;
  coreWebVitals: CoreWebVitals;
  pageSpeed: PageSpeed;
  resourceOptimization: ResourceOptimization;
}

export interface LighthouseResults {
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  pwaScore?: number;
  audits: Record<string, any>;
}

export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  tti: number; // Time to Interactive
  tbt: number; // Total Blocking Time
  si: number; // Speed Index
}

export interface PageSpeed {
  desktop: number;
  mobile: number;
  loadTime: number;
  domContentLoaded: number;
  firstByte: number;
}

export interface ResourceOptimization {
  totalSize: number;
  htmlSize: number;
  cssSize: number;
  jsSize: number;
  imageSize: number;
  fontSize: number;
  requestCount: number;
  cachedResources: number;
  compressionEnabled: boolean;
  minificationEnabled: boolean;
  renderBlockingResources: string[];
}

export interface ContentAnalysis {
  titleOptimization: TitleAnalysis;
  metaDescriptionOptimization: MetaDescriptionAnalysis;
  headerOptimization: HeaderAnalysis;
  keywordAnalysis: KeywordAnalysis;
  contentQuality: ContentQuality;
  imageOptimization: ImageOptimization;
  internalLinking: InternalLinkingAnalysis;
}

export interface TitleAnalysis {
  title: string;
  length: number;
  optimal: boolean;
  hasKeywords: boolean;
  isUnique: boolean;
  recommendations: string[];
}

export interface MetaDescriptionAnalysis {
  description: string;
  length: number;
  optimal: boolean;
  hasKeywords: boolean;
  isUnique: boolean;
  ctrPotential: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export interface HeaderAnalysis {
  h1Count: number;
  h1Text: string[];
  h1Optimal: boolean;
  headerHierarchy: boolean;
  keywordInHeaders: boolean;
  recommendations: string[];
}

export interface KeywordAnalysis {
  targetKeywords: string[];
  keywordDensity: Record<string, number>;
  semanticKeywords: string[];
  keywordPlacement: KeywordPlacement;
  lsiKeywords: string[];
  missingKeywords: string[];
}

export interface KeywordPlacement {
  inTitle: boolean;
  inMetaDescription: boolean;
  inH1: boolean;
  inUrl: boolean;
  inFirstParagraph: boolean;
  inAltTags: boolean;
}

export interface ContentQuality {
  wordCount: number;
  readabilityScore: number;
  readingLevel: string;
  topicalDepth: 'shallow' | 'moderate' | 'comprehensive';
  originalityScore: number;
  engagement: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface ImageOptimization {
  totalImages: number;
  missingAltTags: number;
  oversizedImages: number;
  unoptimizedFormats: number;
  lazyLoadingEnabled: boolean;
  nextGenFormats: boolean;
  recommendations: string[];
}

export interface InternalLinkingAnalysis {
  totalInternalLinks: number;
  averageLinksPerPage: number;
  orphanPages: string[];
  deepLinkedPages: string[];
  anchorTextOptimization: number;
  recommendations: string[];
}

export interface AuthorityAnalysis {
  domainAuthority: number;
  pageAuthority: number;
  backlinks: BacklinkData;
  brandMentions: BrandMentionData;
  localSEO?: LocalSEOData;
}

export interface BacklinkData {
  totalBacklinks: number;
  referringDomains: number;
  followLinks: number;
  nofollowLinks: number;
  toxicLinks: number;
  anchorTextDistribution: Record<string, number>;
  topReferringDomains: ReferringDomain[];
  linkVelocity: number;
}

export interface ReferringDomain {
  domain: string;
  authority: number;
  links: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface BrandMentionData {
  totalMentions: number;
  linkedMentions: number;
  unlinkedMentions: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  sources: string[];
}

export interface LocalSEOData {
  googleMyBusinessOptimized: boolean;
  napConsistency: number;
  localCitations: number;
  reviewCount: number;
  averageRating: number;
  localKeywordRankings: Record<string, number>;
}

export interface CompetitorData {
  url: string;
  domain: string;
  overallScore: number;
  technicalScore: number;
  contentScore: number;
  performanceScore: number;
  authorityScore: number;
  keywordGaps: string[];
  contentGaps: string[];
  strengthsWeaknesses: string[];
}

export interface SEOScores {
  overall: number;
  technical: number;
  content: number;
  performance: number;
  ux: number;
  authority: number;
  breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  crawlability: number;
  siteSpeed: number;
  mobileOptimization: number;
  schemaImplementation: number;
  titleOptimization: number;
  metaDescriptionQuality: number;
  contentQuality: number;
  keywordOptimization: number;
  imageOptimization: number;
  pageSpeed: number;
  userExperience: number;
  accessibility: number;
  mobileUsability: number;
  domainAuthority: number;
  backlinkQuality: number;
  brandMentions: number;
}

export interface SEORecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'technical' | 'content' | 'performance' | 'ux' | 'authority';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  implementation: string;
  timeline: '30-day' | '90-day' | 'long-term';
  affectedPages: string[];
  successCriteria: string[];
}

export interface SEOReport {
  metadata: ReportMetadata;
  executiveSummary: ExecutiveSummary;
  scores: SEOScores;
  technicalSEO: TechnicalSEOData;
  contentAnalysis: ContentAnalysis;
  performanceAnalysis: PerformanceData;
  authorityAnalysis: AuthorityAnalysis;
  competitorAnalysis?: CompetitorData[];
  recommendations: SEORecommendation[];
  implementationRoadmap: ImplementationRoadmap;
  rawData: any;
}

export interface ReportMetadata {
  domain: string;
  url: string;
  generatedAt: Date;
  analysisDepth: string;
  focusArea: string;
  pagesAnalyzed: number;
  analysisVersion: string;
}

export interface ExecutiveSummary {
  overallHealthScore: number;
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  criticalIssues: string[];
  quickWins: string[];
  longTermOpportunities: string[];
  topRecommendations: SEORecommendation[];
}

export interface ImplementationRoadmap {
  day30: SEORecommendation[];
  day90: SEORecommendation[];
  longTerm: SEORecommendation[];
  monitoringRecommendations: string[];
}

export interface ReportOutput {
  htmlPath: string;
  markdownPath: string;
  jsonPath: string;
  csvPath: string;
  pdfPath?: string;
}
