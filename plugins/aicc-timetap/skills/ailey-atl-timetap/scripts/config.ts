import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Workspace root: scripts/ -> skill/ -> skills/ -> .github/ -> workspace
const workspaceRoot = path.resolve(__dirname, '..', '..', '..', '..');

// Load environment variables from multiple locations (in order of precedence)
const envPaths = [
  path.join(process.env.HOME || '', '.vscode', '.env'),
  path.join(workspaceRoot, '.env'),
  path.join(workspaceRoot, '.env.local'),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

export interface TimeTapConfig {
  apiKey?: number;
  privateKey?: string;
  apiUrl: string;
  sessionToken?: string;
  tier?: TimeTapTier;
}

export type TimeTapTier = 'free-trial' | 'professional' | 'business' | 'enterprise';

export interface TierCapabilities {
  classes: boolean;
  recurringAppts: boolean;
  waitlist: boolean;
  customFields: boolean;
  webhooks: boolean;
  reports: boolean;
  enterpriseChildren: boolean;
  roundRobin: boolean;
  paymentIntegration: boolean;
  disclaimerForms: boolean;
  maxStaff: number | null;   // null = unlimited
  maxLocations: number | null;
  apiRateLimit: number; // requests per minute
}

export const TIER_CAPABILITIES: Record<TimeTapTier, TierCapabilities> = {
  'free-trial': {
    classes: false,
    recurringAppts: false,
    waitlist: false,
    customFields: false,
    webhooks: false,
    reports: false,
    enterpriseChildren: false,
    roundRobin: false,
    paymentIntegration: false,
    disclaimerForms: false,
    maxStaff: 1,
    maxLocations: 1,
    apiRateLimit: 30,
  },
  professional: {
    classes: true,
    recurringAppts: true,
    waitlist: false,
    customFields: true,
    webhooks: false,
    reports: true,
    enterpriseChildren: false,
    roundRobin: false,
    paymentIntegration: true,
    disclaimerForms: false,
    maxStaff: 5,
    maxLocations: 3,
    apiRateLimit: 60,
  },
  business: {
    classes: true,
    recurringAppts: true,
    waitlist: true,
    customFields: true,
    webhooks: true,
    reports: true,
    enterpriseChildren: false,
    roundRobin: true,
    paymentIntegration: true,
    disclaimerForms: true,
    maxStaff: null,
    maxLocations: null,
    apiRateLimit: 120,
  },
  enterprise: {
    classes: true,
    recurringAppts: true,
    waitlist: true,
    customFields: true,
    webhooks: true,
    reports: true,
    enterpriseChildren: true,
    roundRobin: true,
    paymentIntegration: true,
    disclaimerForms: true,
    maxStaff: null,
    maxLocations: null,
    apiRateLimit: 300,
  },
};

export function getTimeTapConfig(): TimeTapConfig {
  const apiKeyStr = process.env.TIMETAP_API_KEY;
  const privateKey = process.env.TIMETAP_PRIVATE_KEY;

  if (!apiKeyStr || !privateKey) {
    throw new Error(
      'No TimeTap API credentials configured.\n\n' +
      'Setup:\n' +
      '1. Go to TimeTap Back Office → Settings → Integrations → API Key\n' +
      '2. Enable allowAPIKeys and generate your key pair\n' +
      '3. Add to .env:\n' +
      '   TIMETAP_API_KEY=your_api_key\n' +
      '   TIMETAP_PRIVATE_KEY=your_private_key\n'
    );
  }

  return {
    apiKey: parseInt(apiKeyStr, 10),
    privateKey,
    apiUrl: process.env.TIMETAP_API_URL || 'https://api.timetap.com/live',
    tier: (process.env.TIMETAP_TIER as TimeTapTier) || undefined,
  };
}

export function getTierCapabilities(tier: TimeTapTier): TierCapabilities {
  return TIER_CAPABILITIES[tier];
}

export function checkFeatureAvailability(tier: TimeTapTier, feature: keyof TierCapabilities): boolean {
  const caps = TIER_CAPABILITIES[tier];
  const value = caps[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return value !== null;
}
