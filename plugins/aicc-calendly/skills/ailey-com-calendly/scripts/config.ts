import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine workspace root (3 levels up from this file: scripts/ -> skill/ -> skills/ -> .github/ -> workspace)
const workspaceRoot = path.resolve(__dirname, '..', '..', '..', '..');

// Load environment variables from multiple locations (in order of precedence)
const envPaths = [
  path.join(process.env.HOME || '', '.vscode', '.env'), // User global config
  path.join(workspaceRoot, '.env'),                      // Workspace config
  path.join(workspaceRoot, '.env.local'),                // Local overrides
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

export interface CalendlyConfig {
  // Authentication
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  
  // API Endpoints
  apiUrl: string;
  authUrl: string;
  
  // User context
  userUri?: string;
  
  // Subscription tier
  tier?: CalendlyTier;
  
  // Webhook
  webhookSigningKey?: string;
}

export type CalendlyTier = 'basic' | 'essentials' | 'professional' | 'teams' | 'enterprise';

export type AuthMethod = 'token' | 'oauth' | 'none';

export interface TierCapabilities {
  webhooks: boolean;
  teams: boolean;
  routing: boolean;
  workflows: boolean;
  customFields: boolean;
  analytics: boolean;
  salesforce: boolean;
  adminReporting: boolean;
  sso: boolean;
  apiRateLimit: number; // requests per minute
}

// Tier capabilities mapping
export const TIER_CAPABILITIES: Record<CalendlyTier, TierCapabilities> = {
  basic: {
    webhooks: false,
    teams: false,
    routing: false,
    workflows: false,
    customFields: false,
    analytics: false,
    salesforce: false,
    adminReporting: false,
    sso: false,
    apiRateLimit: 60,
  },
  essentials: {
    webhooks: false,
    teams: false,
    routing: false,
    workflows: false,
    customFields: true,
    analytics: true,
    salesforce: false,
    adminReporting: false,
    sso: false,
    apiRateLimit: 100,
  },
  professional: {
    webhooks: true,
    teams: false,
    routing: true,
    workflows: true,
    customFields: true,
    analytics: true,
    salesforce: true,
    adminReporting: false,
    sso: false,
    apiRateLimit: 150,
  },
  teams: {
    webhooks: true,
    teams: true,
    routing: true,
    workflows: true,
    customFields: true,
    analytics: true,
    salesforce: true,
    adminReporting: true,
    sso: false,
    apiRateLimit: 200,
  },
  enterprise: {
    webhooks: true,
    teams: true,
    routing: true,
    workflows: true,
    customFields: true,
    analytics: true,
    salesforce: true,
    adminReporting: true,
    sso: true,
    apiRateLimit: 300,
  },
};

export function getCalendlyConfig(): CalendlyConfig {
  return {
    accessToken: process.env.CALENDLY_ACCESS_TOKEN,
    clientId: process.env.CALENDLY_CLIENT_ID,
    clientSecret: process.env.CALENDLY_CLIENT_SECRET,
    redirectUri: process.env.CALENDLY_REDIRECT_URI || 'http://localhost:3000/callback',
    apiUrl: process.env.CALENDLY_API_URL || 'https://api.calendly.com',
    authUrl: process.env.CALENDLY_AUTH_URL || 'https://auth.calendly.com',
    userUri: process.env.CALENDLY_USER_URI,
    tier: process.env.CALENDLY_TIER as CalendlyTier,
    webhookSigningKey: process.env.CALENDLY_WEBHOOK_SIGNING_KEY,
  };
}

export function getAuthMethod(config: CalendlyConfig): AuthMethod {
  if (config.accessToken) {
    return 'token';
  }
  if (config.clientId && config.clientSecret) {
    return 'oauth';
  }
  return 'none';
}

export function getTierCapabilities(tier: CalendlyTier): TierCapabilities {
  return TIER_CAPABILITIES[tier];
}

export function checkFeatureAvailability(tier: CalendlyTier, feature: keyof TierCapabilities): boolean {
  return TIER_CAPABILITIES[tier][feature] as boolean;
}
