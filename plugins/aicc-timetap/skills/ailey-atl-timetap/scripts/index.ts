#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { getTimeTapConfig } from './config.js';
import TimeTapClient from './timetap-client.js';

const program = new Command();

program
  .name('timetap')
  .description('TimeTap CLI - Manage TimeTap scheduling and appointments')
  .version('1.0.0');

// Auth command
program
  .command('auth')
  .description('Authenticate and obtain a session token')
  .action(async () => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      const token = await client.authenticate();
      console.log(chalk.green('✓ Authenticated successfully'));
      console.log(chalk.gray(`Session token: ${token}`));
    } catch (error: any) {
      console.error(chalk.red('✗ Authentication failed:'), error.message);
      process.exit(1);
    }
  });

// Setup command
program
  .command('setup')
  .description('Display setup instructions for TimeTap API access')
  .action(() => {
    console.log(chalk.blue('TimeTap API Setup'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.yellow('\nAPI Key Setup:'));
    console.log('1. Log in to TimeTap Back Office');
    console.log('2. Go to Settings → Integrations → API Key');
    console.log('3. Ensure "allowAPIKeys" is enabled on your account');
    console.log('4. Generate your API Key pair');
    console.log('5. Add credentials to .env:');
    console.log(chalk.cyan('   TIMETAP_API_KEY=your_api_key'));
    console.log(chalk.cyan('   TIMETAP_PRIVATE_KEY=your_private_key'));
    console.log(chalk.yellow('\nNote:'));
    console.log('API integration requires a Business or Enterprise account.');
    console.log('The API key is your public key (sent with requests).');
    console.log('The private key is used only for signature generation and should never be shared.');
  });

// Detect tier
program
  .command('detect-tier')
  .description('Detect TimeTap account tier')
  .action(async () => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      const tier = await client.detectTier();
      console.log(chalk.green(`✓ Account tier: ${tier}`));
    } catch (error: any) {
      console.error(chalk.red('✗ Tier detection failed:'), error.message);
      process.exit(1);
    }
  });

// Appointments
program
  .command('appointments')
  .description('List appointments')
  .option('--start <date>', 'Start date (YYYY-MM-DD)')
  .option('--end <date>', 'End date (YYYY-MM-DD)')
  .option('--status <list>', 'Comma-separated status list (OPEN,CONFIRMED,CANCELLED,...)')
  .option('--page <number>', 'Page number', '1')
  .option('--size <number>', 'Page size (max 50)', '25')
  .action(async (options) => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      const result = await client.listAppointments({
        startDate: options.start,
        endDate: options.end,
        statusList: options.status,
        pageNumber: parseInt(options.page),
        pageSize: parseInt(options.size),
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Create appointment
program
  .command('create-appointment')
  .description('Create a new appointment')
  .requiredOption('--locationId <id>', 'Location ID')
  .requiredOption('--staffId <id>', 'Staff (professional) ID')
  .requiredOption('--reasonId <id>', 'Service/reason ID')
  .option('--clientId <id>', 'Client ID')
  .requiredOption('--date <date>', 'Appointment date (YYYY-MM-DD)')
  .requiredOption('--startTime <time>', 'Start time (military format, e.g. 1400)')
  .requiredOption('--endTime <time>', 'End time (military format, e.g. 1500)')
  .option('--override', 'Override schedule conflicts')
  .action(async (options) => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      const appointment: any = {
        businessId: config.apiKey,
        location: { locationId: parseInt(options.locationId) },
        staff: { professionalId: parseInt(options.staffId) },
        reason: { reasonId: parseInt(options.reasonId) },
        clientStartDate: options.date,
        clientEndDate: options.date,
        startDate: options.date,
        endDate: options.date,
        clientStartTime: parseInt(options.startTime),
        clientEndTime: parseInt(options.endTime),
        startTime: parseInt(options.startTime),
        endTime: parseInt(options.endTime),
        status: 'OPEN',
        clientReminderHours: 24,
        staffReminderHours: 24,
        remindClientSmsHrs: 0,
        remindStaffSmsHrs: 0,
        sendConfirmationToClient: true,
        sendConfirmationToStaff: true,
      };
      if (options.clientId) {
        appointment.client = { clientId: parseInt(options.clientId) };
      }
      const result = await client.createAppointment(appointment, !!options.override);
      console.log(chalk.green('✓ Appointment created'));
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Cancel appointment
program
  .command('cancel-appointment')
  .description('Cancel an appointment')
  .requiredOption('--id <calendarId>', 'Calendar/appointment ID')
  .option('--notifyStaff', 'Send email to staff')
  .option('--notifyClient', 'Send email to client')
  .action(async (options) => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      await client.cancelAppointment(
        parseInt(options.id),
        !!options.notifyStaff,
        !!options.notifyClient
      );
      console.log(chalk.green('✓ Appointment cancelled'));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Complete appointment
program
  .command('complete-appointment')
  .description('Mark an appointment as completed')
  .requiredOption('--id <calendarId>', 'Calendar/appointment ID')
  .option('--notifyClient', 'Send thank-you email to client')
  .option('--reason <text>', 'Completion note')
  .action(async (options) => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      await client.completeAppointment(parseInt(options.id), !!options.notifyClient, options.reason);
      console.log(chalk.green('✓ Appointment marked as completed'));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Clients
program
  .command('clients')
  .description('List clients')
  .option('--page <number>', 'Page number', '1')
  .option('--size <number>', 'Page size', '25')
  .action(async (options) => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      const result = await client.listClients({
        pageNumber: parseInt(options.page),
        pageSize: parseInt(options.size),
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Search clients
program
  .command('search-clients')
  .description('Search for clients by term')
  .requiredOption('--term <searchTerm>', 'Search term (name, email, etc.)')
  .action(async (options) => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      const result = await client.searchClients(options.term);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Services
program
  .command('services')
  .description('List services')
  .option('--locationId <id>', 'Filter by location')
  .option('--staffId <id>', 'Filter by staff member')
  .action(async (options) => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      const result = await client.listServices({
        locationId: options.locationId ? parseInt(options.locationId) : undefined,
        staffId: options.staffId ? parseInt(options.staffId) : undefined,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Staff
program
  .command('staff')
  .description('List staff members')
  .action(async () => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      const result = await client.listStaff();
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Locations
program
  .command('locations')
  .description('List locations')
  .action(async () => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      const result = await client.listLocations();
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Availability
program
  .command('availability')
  .description('Check availability for a date')
  .requiredOption('--date <date>', 'Date (YYYY-MM-DD)')
  .option('--locationId <id>', 'Location ID')
  .option('--reasonId <id>', 'Service/reason ID')
  .option('--staffId <id>', 'Staff ID')
  .action(async (options) => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      const [year, month, day] = options.date.split('-');
      const result = await client.getAvailability(year, month, day, {
        locationId: options.locationId ? parseInt(options.locationId) : undefined,
        reasonId: options.reasonId ? parseInt(options.reasonId) : undefined,
        staffId: options.staffId ? parseInt(options.staffId) : undefined,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Business info
program
  .command('business')
  .description('Get business information')
  .action(async () => {
    try {
      const config = getTimeTapConfig();
      const client = new TimeTapClient(config);
      const result = await client.getBusiness();
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
