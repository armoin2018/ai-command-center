import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workspaceRoot = path.resolve(__dirname, '..', '..', '..', '..');

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

export interface TwilioConfig {
  accountSid: string;
  apiKey?: string;
  apiSecret?: string;
  authToken?: string;
  fromNumber?: string;
  messagingServiceSid?: string;
  verifyServiceSid?: string;
  webhookUrl?: string;
  tier?: TwilioTier;
}

export type TwilioTier = 'free-trial' | 'pay-as-you-go' | 'production';

export type AuthMethod = 'api-key' | 'auth-token' | 'none';

export interface TierCapabilities {
  sms: boolean;
  mms: boolean;
  voice: boolean;
  phoneNumberPurchase: boolean;
  verify: boolean;
  messagingServices: boolean;
  whatsapp: boolean;
  callRecording: boolean;
  webhooks: boolean;
  usage: boolean;
  serverless: boolean;
  flex: boolean;
  customCallerId: boolean;
  tollFreeNumbers: boolean;
  shortCodes: boolean;
  verifiedNumbersOnly: boolean;
}

export const TIER_CAPABILITIES: Record<TwilioTier, TierCapabilities> = {
  'free-trial': {
    sms: true,
    mms: true,
    voice: true,
    phoneNumberPurchase: false,
    verify: true,
    messagingServices: false,
    whatsapp: false,
    callRecording: true,
    webhooks: true,
    usage: true,
    serverless: false,
    flex: false,
    customCallerId: false,
    tollFreeNumbers: false,
    shortCodes: false,
    verifiedNumbersOnly: true,
  },
  'pay-as-you-go': {
    sms: true,
    mms: true,
    voice: true,
    phoneNumberPurchase: true,
    verify: true,
    messagingServices: true,
    whatsapp: true,
    callRecording: true,
    webhooks: true,
    usage: true,
    serverless: true,
    flex: false,
    customCallerId: true,
    tollFreeNumbers: true,
    shortCodes: false,
    verifiedNumbersOnly: false,
  },
  production: {
    sms: true,
    mms: true,
    voice: true,
    phoneNumberPurchase: true,
    verify: true,
    messagingServices: true,
    whatsapp: true,
    callRecording: true,
    webhooks: true,
    usage: true,
    serverless: true,
    flex: true,
    customCallerId: true,
    tollFreeNumbers: true,
    shortCodes: true,
    verifiedNumbersOnly: false,
  },
};

export function getTwilioConfig(): TwilioConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;

  if (!accountSid) {
    throw new Error(
      'No Twilio credentials configured.\n\n' +
      'Setup:\n' +
      '1. Log in to https://www.twilio.com/console\n' +
      '2. Find your Account SID on the dashboard\n' +
      '3. Create an API Key at Account → API Keys & Tokens\n' +
      '4. Add to .env:\n' +
      '   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n' +
      '   TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n' +
      '   TWILIO_API_SECRET=your_api_key_secret\n'
    );
  }

  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!apiKey && !authToken) {
    throw new Error(
      'No authentication method configured.\n' +
      'Set either TWILIO_API_KEY + TWILIO_API_SECRET (recommended)\n' +
      'or TWILIO_AUTH_TOKEN (testing only).'
    );
  }

  return {
    accountSid,
    apiKey,
    apiSecret,
    authToken,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
    webhookUrl: process.env.TWILIO_WEBHOOK_URL,
    tier: (process.env.TWILIO_TIER as TwilioTier) || undefined,
  };
}

export function getAuthMethod(config: TwilioConfig): AuthMethod {
  if (config.apiKey && config.apiSecret) return 'api-key';
  if (config.authToken) return 'auth-token';
  return 'none';
}

export function getTierCapabilities(tier: TwilioTier): TierCapabilities {
  return TIER_CAPABILITIES[tier];
}

export function checkFeatureAvailability(tier: TwilioTier, feature: keyof TierCapabilities): boolean {
  return TIER_CAPABILITIES[tier][feature];
}
