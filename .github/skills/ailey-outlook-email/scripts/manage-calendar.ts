#!/usr/bin/env tsx
/**
 * Manage Calendar CLI
 */

import { Command } from 'commander';
import { OutlookClient } from './outlook-client.js';

const program = new Command();

program
  .name('manage-calendar')
  .description('Manage Outlook calendar events')
  .version('1.0.0');

program
  .command('create')
  .description('Create calendar event')
  .requiredOption('-s, --subject <subject>', 'Event subject')
  .requiredOption('--start <datetime>', 'Start date/time (ISO format or YYYY-MM-DD HH:mm)')
  .requiredOption('--end <datetime>', 'End date/time (ISO format or YYYY-MM-DD HH:mm)')
  .option('-l, --location <location>', 'Event location')
  .option('-b, --body <body>', 'Event description')
  .option('--attendees <emails>', 'Attendee emails, comma-separated')
  .option('--online', 'Create Teams online meeting', false)
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      // Parse dates
      const start = new Date(options.start);
      const end = new Date(options.end);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format. Use ISO format or YYYY-MM-DD HH:mm');
      }

      const attendees = options.attendees
        ? options.attendees.split(',').map((e: string) => e.trim())
        : undefined;

      console.log(`Creating event "${options.subject}"...`);

      const event = await client.createEvent({
        subject: options.subject,
        start,
        end,
        location: options.location,
        body: options.body,
        attendees,
        isOnline: options.online,
      });

      console.log('✅ Event created successfully!');
      console.log(`Subject: ${event.subject}`);
      console.log(`Start: ${new Date(event.start!.dateTime!).toLocaleString()}`);
      console.log(`End: ${new Date(event.end!.dateTime!).toLocaleString()}`);
      if (event.location) console.log(`Location: ${event.location.displayName}`);
      if (event.isOnlineMeeting) console.log(`Teams meeting: ${event.onlineMeeting?.joinUrl}`);
      console.log(`Event ID: ${event.id}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List calendar events')
  .option('--start <date>', 'Start date (YYYY-MM-DD)')
  .option('--end <date>', 'End date (YYYY-MM-DD)')
  .option('--days <number>', 'Number of days from today', '7')
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (options.start) {
        startDate = new Date(options.start);
      } else {
        startDate = new Date();
      }

      if (options.end) {
        endDate = new Date(options.end);
      } else {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + parseInt(options.days));
      }

      console.log(`Fetching events from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}...`);

      const events = await client.listEvents(startDate, endDate);

      if (events.length === 0) {
        console.log('No events found.');
        return;
      }

      console.log(`\nFound ${events.length} events:\n`);
      console.log('Subject'.padEnd(40) + 'Start'.padEnd(25) + 'Location');
      console.log('-'.repeat(100));

      events.forEach((event: any) => {
        const subject = (event.subject || '(no subject)').substring(0, 38).padEnd(40);
        const start = new Date(event.start.dateTime).toLocaleString().padEnd(25);
        const location = (event.location?.displayName || 'No location').substring(0, 35);
        console.log(`${subject}${start}${location}`);
      });

      console.log(`\nTotal: ${events.length} events`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('show')
  .description('Show event details')
  .requiredOption('-i, --id <eventId>', 'Event ID')
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      console.log(`Fetching event ${options.id}...`);

      const event: any = await client.getEvent(options.id);

      console.log('\n=== EVENT DETAILS ===');
      console.log(`Subject: ${event.subject || '(no subject)'}`);
      console.log(`Start: ${new Date(event.start.dateTime).toLocaleString()}`);
      console.log(`End: ${new Date(event.end.dateTime).toLocaleString()}`);
      if (event.location) console.log(`Location: ${event.location.displayName}`);
      if (event.body?.content) console.log(`\nDescription:\n${event.body.content}`);
      if (event.attendees && event.attendees.length > 0) {
        console.log(`\nAttendees:`);
        event.attendees.forEach((att: any) => {
          console.log(`  - ${att.emailAddress.address} (${att.status?.response || 'no response'})`);
        });
      }
      if (event.isOnlineMeeting) {
        console.log(`\nTeams Meeting: ${event.onlineMeeting?.joinUrl}`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Update calendar event')
  .requiredOption('-i, --id <eventId>', 'Event ID')
  .option('-s, --subject <subject>', 'New subject')
  .option('--start <datetime>', 'New start date/time')
  .option('--end <datetime>', 'New end date/time')
  .option('-l, --location <location>', 'New location')
  .option('-b, --body <body>', 'New description')
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      const updates: any = {};
      if (options.subject) updates.subject = options.subject;
      if (options.start) updates.start = new Date(options.start);
      if (options.end) updates.end = new Date(options.end);
      if (options.location) updates.location = options.location;
      if (options.body) updates.body = options.body;

      console.log(`Updating event ${options.id}...`);

      const event = await client.updateEvent(options.id, updates);

      console.log('✅ Event updated successfully!');
      console.log(`Subject: ${event.subject}`);
      console.log(`Start: ${new Date(event.start!.dateTime!).toLocaleString()}`);
      console.log(`End: ${new Date(event.end!.dateTime!).toLocaleString()}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('delete')
  .description('Delete calendar event')
  .requiredOption('-i, --id <eventId>', 'Event ID')
  .option('--confirm', 'Confirm deletion', false)
  .action(async (options) => {
    try {
      if (!options.confirm) {
        console.log('Use --confirm to delete the event');
        process.exit(1);
      }

      const client = new OutlookClient();

      console.log(`Deleting event ${options.id}...`);

      await client.deleteEvent(options.id);

      console.log('✅ Event deleted successfully!');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default program;
