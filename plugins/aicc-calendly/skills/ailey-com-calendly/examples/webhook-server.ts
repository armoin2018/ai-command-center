#!/usr/bin/env node
/**
 * Webhook Server - Handle Calendly webhook events
 * 
 * Usage: node webhook-server.ts
 * 
 * Listens on port 3000 for webhook events from Calendly
 */

import express from 'express';
import crypto from 'crypto';
import { getCalendlyConfig } from '../scripts/config.js';

const app = express();
const config = getCalendlyConfig();

// Middleware to verify webhook signature
function verifyWebhookSignature(req: express.Request, res: express.Response, next: express.NextFunction) {
  const signature = req.headers['calendly-webhook-signature'] as string;
  const signingKey = config.webhookSigningKey;

  if (!signingKey) {
    console.warn('⚠️  CALENDLY_WEBHOOK_SIGNING_KEY not set - skipping signature verification');
    return next();
  }

  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', signingKey)
    .update(payload)
    .digest('base64');

  if (signature !== expectedSignature) {
    console.error('❌ Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

app.use(express.json());

// Webhook endpoint
app.post('/webhook', verifyWebhookSignature, (req, res) => {
  const event = req.body;
  
  console.log('📥 Received webhook event:', event.event);
  console.log('   Time:', event.time);
  
  // Handle different event types
  switch (event.event) {
    case 'invitee.created':
      handleInviteeCreated(event.payload);
      break;
      
    case 'invitee.canceled':
      handleInviteeCanceled(event.payload);
      break;
      
    case 'invitee_no_show.created':
      handleNoShowCreated(event.payload);
      break;
      
    case 'routing_form_submission.created':
      handleRoutingFormSubmission(event.payload);
      break;
      
    default:
      console.log('   Unknown event type:', event.event);
  }
  
  // Acknowledge receipt
  res.status(200).json({ received: true });
});

function handleInviteeCreated(payload: any) {
  console.log('✅ New booking created');
  console.log('   Name:', payload.name);
  console.log('   Email:', payload.email);
  console.log('   Event:', payload.event);
  
  // Add your custom logic here:
  // - Send confirmation email
  // - Add to CRM
  // - Create calendar event
  // - Notify team members
  // - Update analytics dashboard
}

function handleInviteeCanceled(payload: any) {
  console.log('❌ Booking canceled');
  console.log('   Name:', payload.name);
  console.log('   Email:', payload.email);
  console.log('   Reason:', payload.cancellation?.reason || 'No reason provided');
  
  // Add your custom logic here:
  // - Send cancellation confirmation
  // - Update CRM
  // - Free up calendar slot
  // - Notify team members
}

function handleNoShowCreated(payload: any) {
  console.log('⚠️  No-show marked');
  console.log('   Name:', payload.name);
  console.log('   Email:', payload.email);
  
  // Add your custom logic here:
  // - Send follow-up email
  // - Update attendance records
  // - Trigger rescheduling workflow
}

function handleRoutingFormSubmission(payload: any) {
  console.log('📝 Routing form submitted');
  console.log('   Submission ID:', payload.uri);
  
  // Add your custom logic here:
  // - Process form responses
  // - Route to appropriate team member
  // - Create lead in CRM
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/webhook`);
  console.log('\nTo receive webhooks from Calendly:');
  console.log('1. Expose this server with ngrok or similar tool');
  console.log('2. Create webhook subscription pointing to your public URL');
  console.log('3. Events will appear here as they occur\n');
});
