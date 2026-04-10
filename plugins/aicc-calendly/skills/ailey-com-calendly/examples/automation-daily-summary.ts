#!/usr/bin/env node
/**
 * Daily Summary - Send email with today's scheduled events
 * 
 * Usage: node automation-daily-summary.ts
 * 
 * Schedule with cron: 0 8 * * * /path/to/automation-daily-summary.ts
 */

import { getCalendlyConfig } from '../scripts/config.js';
import CalendlyClient from '../scripts/calendly-client.js';

async function dailySummary() {
  const config = getCalendlyConfig();
  const client = new CalendlyClient(config);

  // Get current user
  const user = await client.getCurrentUser();
  console.log(`Daily Summary for ${user.resource.name}`);
  console.log('═'.repeat(60));

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch today's events
  const result = await client.listScheduledEvents({
    user: user.resource.uri,
    status: 'active',
    min_start_time: today.toISOString(),
    max_start_time: tomorrow.toISOString(),
  });

  const events = result.collection;

  if (events.length === 0) {
    console.log('\n✓ No events scheduled for today!');
    return;
  }

  console.log(`\n📅 You have ${events.length} event(s) today:\n`);

  for (const event of events) {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    
    console.log(`${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`);
    console.log(`  ${event.name}`);
    console.log(`  Location: ${event.location?.type || 'TBD'}`);
    
    // Get invitee details
    const invitees = await client.listEventInvitees(event.uri.split('/').pop()!);
    if (invitees.collection.length > 0) {
      const invitee = invitees.collection[0];
      console.log(`  With: ${invitee.name} (${invitee.email})`);
    }
    
    console.log('');
  }

  // Optional: Send email summary (requires email integration)
  // await sendEmailSummary(user.resource.email, events);
}

dailySummary().catch(console.error);
