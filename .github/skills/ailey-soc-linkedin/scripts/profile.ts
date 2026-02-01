import { Command } from 'commander';
import { LinkedInClient, loadConfig } from './linkedin-client.js';

const program = new Command();

program
  .name('linkedin-profile')
  .description('LinkedIn profile management');

// ============================================================================
// PROFILE COMMANDS
// ============================================================================

program
  .command('show')
  .description('Show your LinkedIn profile information')
  .action(async () => {
    try {
      const config = loadConfig();
      const client = new LinkedInClient(config);
      
      console.log('Fetching profile information...\n');
      
      const profile = await client.getProfile();
      
      console.log('LinkedIn Profile:');
      console.log('═══════════════════════════════════════\n');
      console.log(`ID: ${profile.id}`);
      console.log(`Name: ${profile.firstName} ${profile.lastName}`);
      console.log(`Headline: ${profile.headline || '(not set)'}`);
      
      if (profile.profilePicture) {
        console.log(`Profile Picture: Available`);
      }
      
      console.log('\n');
      
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('vanity')
  .description('Get your LinkedIn vanity URL')
  .action(async () => {
    try {
      const config = loadConfig();
      const client = new LinkedInClient(config);
      
      console.log('Fetching vanity name...\n');
      
      const vanityName = await client.getVanityName();
      
      console.log(`Vanity Name: ${vanityName}`);
      console.log(`Profile URL: https://www.linkedin.com/in/${vanityName}\n`);
      
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
