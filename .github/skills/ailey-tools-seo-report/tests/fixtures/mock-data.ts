/**
 * Mock SEO Data for Testing
 */

import type { SEOReport } from '../../lib/types.js';

export function createMockReport(): SEOReport {
  return {
    metadata: {
      domain: 'example.com',
      url: 'https://example.com',
      generatedAt: new Date('2024-01-15T10:00:00Z'),
      analysisVersion: '1.0.0',
      pagesAnalyzed: 15,
      timeElapsed: 12500
    },
    scores: {
      overall: 72,
      technical: 85,
      content: 68,
      performance: 75,
      ux: 80,
      authority: 60,
      technicalInsight: 'Strong technical foundation',
      contentInsight: 'Content needs optimization',
      performanceInsight: 'Good load times',
      uxInsight: 'Excellent mobile experience',
      authorityInsight: 'Limited backlink profile'
    },
    technicalSEO: {
      crawlability: 90,
      indexability: 95,
      httpsEnabled: true,
      robotsTxtExists: true,
      robotsTxtValid: true,
      sitemapValid: true,
      sitemapUrls: 150,
      canonicalTagsPresent: true,
      canonicalTagsValid: 145,
      structuredData: [
        { type: 'Organization', valid: true, errors: [] },
        { type: 'WebPage', valid: true, errors: [] }
      ],
      brokenLinks: [],
      redirectChains: 2,
      mobileFriendly: true,
      responsiveDesign: true,
      schemaImplementation: 85
    },
    performanceAnalysis: {
      coreWebVitals: {
        lcp: 2.3,
        fid: 85,
        cls: 0.08,
        ttfb: 650,
        fcp: 1.8
      },
      pageSpeed: {
        loadTime: 2.8,
        timeToInteractive: 3.2,
        speedIndex: 2.5,
        totalSize: 1.8 * 1024 * 1024
      },
      optimizationOpportunities: [
        { type: 'Image compression', potentialSavings: '420KB', impact: 'High' },
        { type: 'Minify JavaScript', potentialSavings: '180KB', impact: 'Medium' }
      ]
    },
    contentAnalysis: {
      titleOptimization: {
        title: 'Example Domain - Quality Products & Services',
        length: 45,
        optimal: true,
        keywordPresent: true,
        score: 95
      },
      metaDescription: {
        description: 'Discover quality products and services from Example Domain. Learn more about our offerings and expertise.',
        length: 125,
        optimal: true,
        keywordPresent: true,
        score: 90
      },
      contentQuality: {
        wordCount: 1200,
        readabilityScore: 75,
        topicalDepth: 'Good',
        contentFreshness: 'Updated recently',
        duplicateContent: false,
        uniquenessScore: 92
      },
      headingStructure: [
        { tag: 'h1', text: 'Welcome to Example Domain', optimized: true },
        { tag: 'h2', text: 'Our Services', optimized: true },
        { tag: 'h2', text: 'Why Choose Us', optimized: true }
      ],
      keywordAnalysis: [
        { keyword: 'example', frequency: 12, density: 1.0, placement: ['title', 'h1', 'body'] },
        { keyword: 'domain', frequency: 8, density: 0.7, placement: ['title', 'body'] }
      ],
      imageOptimization: {
        totalImages: 15,
        imagesWithAlt: 13,
        lazyLoadedImages: 10,
        score: 75
      }
    },
    authorityAnalysis: {
      domainAuthority: 42,
      pageAuthority: 38,
      backlinks: {
        total: 85,
        dofollow: 65,
        nofollow: 20,
        unique: 45
      },
      referringDomains: 28,
      trustScore: 65
    },
    recommendations: [
      {
        id: 'rec-001',
        priority: 'critical',
        category: 'Technical',
        title: 'Fix Mobile Responsiveness Issues',
        description: 'Several pages show layout issues on mobile devices.',
        impact: 'High',
        effort: 'Medium',
        timeline: '1 week',
        implementation: 'Update CSS media queries and test on multiple devices.',
        resources: ['https://web.dev/responsive-web-design-basics/']
      },
      {
        id: 'rec-002',
        priority: 'high',
        category: 'Content',
        title: 'Optimize Title Tags',
        description: '8 pages have title tags that are too short or missing keywords.',
        impact: 'High',
        effort: 'Low',
        timeline: '2-3 days',
        implementation: 'Review and update title tags to include primary keywords and stay within 30-60 characters.',
        resources: ['https://moz.com/learn/seo/title-tag']
      },
      {
        id: 'rec-003',
        priority: 'medium',
        category: 'Performance',
        title: 'Compress Images',
        description: 'Large images are slowing page load times.',
        impact: 'Medium',
        effort: 'Low',
        timeline: '1 week',
        implementation: 'Use tools like ImageOptim or Squoosh to compress images without quality loss.',
        resources: ['https://web.dev/fast/#optimize-your-images']
      }
    ],
    executiveSummary: {
      overallHealthScore: 72,
      healthGrade: 'C',
      criticalIssues: [
        'Critical Issue 1: Mobile responsiveness needs improvement',
        'Critical Issue 2: Missing alt text on 2 images'
      ],
      quickWins: [
        'Add missing image alt text',
        'Optimize 8 title tags',
        'Compress 10 large images'
      ],
      strengths: [
        'Strong technical SEO foundation',
        'Fast page load times',
        'Good mobile usability'
      ],
      weaknesses: [
        'Limited content depth',
        'Low domain authority',
        'Few internal links'
      ],
      estimatedMonthlyTraffic: 2500,
      potentialTrafficIncrease: 45
    },
    implementationRoadmap: {
      day30: [
        {
          id: 'task-001',
          title: 'Fix mobile responsiveness',
          priority: 'critical',
          category: 'Technical',
          impact: 'High',
          effort: 'Medium',
          timeline: '1 week'
        },
        {
          id: 'task-002',
          title: 'Optimize title tags',
          priority: 'high',
          category: 'Content',
          impact: 'High',
          effort: 'Low',
          timeline: '2-3 days'
        }
      ],
      day90: [
        {
          id: 'task-003',
          title: 'Implement content strategy',
          priority: 'medium',
          category: 'Content',
          impact: 'High',
          effort: 'High',
          timeline: '6 weeks'
        }
      ],
      day180: [
        {
          id: 'task-004',
          title: 'Build backlink profile',
          priority: 'medium',
          category: 'Authority',
          impact: 'High',
          effort: 'High',
          timeline: '3 months'
        }
      ],
      longTerm: [
        {
          id: 'task-005',
          title: 'Expand to additional markets',
          priority: 'low',
          category: 'Content',
          impact: 'Medium',
          effort: 'High',
          timeline: '6+ months'
        }
      ],
      ongoing: []
    }
  };
}

export function createComplexMockReport(): SEOReport {
  const base = createMockReport();
  
  // Add more complex data
  base.technicalSEO.brokenLinks = [
    'https://example.com/broken-page-1',
    'https://example.com/broken-page-2',
    'https://example.com/broken-page-3'
  ];
  
  base.recommendations = [
    ...base.recommendations,
    {
      id: 'rec-004',
      priority: 'low',
      category: 'UX',
      title: 'Improve Navigation',
      description: 'Main navigation could be more intuitive.',
      impact: 'Low',
      effort: 'Medium',
      timeline: '2 weeks',
      implementation: 'Conduct user testing and redesign navigation structure.',
      resources: ['https://www.nngroup.com/articles/navigation/']
    }
  ];
  
  return base;
}
