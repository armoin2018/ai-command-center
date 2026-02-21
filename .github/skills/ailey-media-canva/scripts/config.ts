import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine workspace root (4 levels up from this file)
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

export interface CanvaConfig {
  // Authentication
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  accessToken?: string;
  refreshToken?: string;
  
  // API Endpoints
  apiUrl: string;
  authUrl: string;
  
  // User context
  brandId?: string;
  teamId?: string;
  
  // Account tier
  tier?: CanvaTier;
}

export type CanvaTier = 'free' | 'pro' | 'teams' | 'enterprise';

export interface TierCapabilities {
  brandKit: boolean;
  templates: number; // Number of templates available
  storage: number; // GB of storage
  teamMembers: number; // Max team members
  folders: boolean;
  magicResize: boolean;
  backgroundRemover: boolean;
  brandKitSharing: boolean;
  customFonts: boolean;
  prioritySupport: boolean;
  sso: boolean;
  apiRateLimit: number; // requests per minute
}

// Tier capabilities mapping
export const TIER_CAPABILITIES: Record<CanvaTier, TierCapabilities> = {
  free: {
    brandKit: false,
    templates: 250000,
    storage: 5,
    teamMembers: 0,
    folders: true,
    magicResize: false,
    backgroundRemover: false,
    brandKitSharing: false,
    customFonts: false,
    prioritySupport: false,
    sso: false,
    apiRateLimit: 60,
  },
  pro: {
    brandKit: true,
    templates: 610000,
    storage: 1000,
    teamMembers: 0,
    folders: true,
    magicResize: true,
    backgroundRemover: true,
    brandKitSharing: false,
    customFonts: true,
    prioritySupport: false,
    sso: false,
    apiRateLimit: 120,
  },
  teams: {
    brandKit: true,
    templates: 610000,
    storage: 1000,
    teamMembers: 50,
    folders: true,
    magicResize: true,
    backgroundRemover: true,
    brandKitSharing: true,
    customFonts: true,
    prioritySupport: true,
    sso: false,
    apiRateLimit: 200,
  },
  enterprise: {
    brandKit: true,
    templates: 610000,
    storage: -1, // unlimited
    teamMembers: -1, // unlimited
    folders: true,
    magicResize: true,
    backgroundRemover: true,
    brandKitSharing: true,
    customFonts: true,
    prioritySupport: true,
    sso: true,
    apiRateLimit: 300,
  },
};

export function getCanvaConfig(): CanvaConfig {
  return {
    clientId: process.env.CANVA_CLIENT_ID,
    clientSecret: process.env.CANVA_CLIENT_SECRET,
    redirectUri: process.env.CANVA_REDIRECT_URI || 'http://localhost:3000/callback',
    accessToken: process.env.CANVA_ACCESS_TOKEN,
    refreshToken: process.env.CANVA_REFRESH_TOKEN,
    apiUrl: process.env.CANVA_API_URL || 'https://api.canva.com/rest/v1',
    authUrl: process.env.CANVA_AUTH_URL || 'https://www.canva.com/api/oauth',
    brandId: process.env.CANVA_BRAND_ID,
    teamId: process.env.CANVA_TEAM_ID,
    tier: process.env.CANVA_TIER as CanvaTier,
  };
}

export function getTierCapabilities(tier: CanvaTier): TierCapabilities {
  return TIER_CAPABILITIES[tier];
}

export function checkFeatureAvailability(tier: CanvaTier, feature: keyof TierCapabilities): boolean {
  const value = TIER_CAPABILITIES[tier][feature];
  return typeof value === 'boolean' ? value : value > 0;
}
