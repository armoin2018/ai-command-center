import { Command } from 'commander';
import { LinkedInClient, loadConfig } from './linkedin-client.js';

const program = new Command();

program
  .name('linkedin-pages')
  .description('LinkedIn company page management');

// ============================================================================
// PAGES COMMANDS
// ============================================================================

program
  .command('list')
  .description('List company pages you can administer')
  .action(async () => {
    try {
      const config = loadConfig();
      const client = new LinkedInClient(config);
      
      console.log('Fetching company pages...\n');
      
      const organizations = await client.getOrganizations();
      
      if (organizations.length === 0) {
        console.log('No company pages found.');
        console.log('You must be an administrator of a LinkedIn page to manage it.\n');
        return;
      }
      
      console.log(`Found ${organizations.length} company page(s):\n`);
      
      for (const org of organizations) {
        console.log(`ID: ${org.id}`);
        console.log(`Name: ${org.name}`);
        if (org.vanityName) {
          console.log(`URL: https://www.linkedin.com/company/${org.vanityName}`);
        }
        console.log('---');
      }
      
      console.log('\nUse organization ID to post as company page.\n');
      
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('post')
  .description('Post to company page')
  .argument('<organization-id>', 'Organization/company ID')
  .option('--text <text>', 'Post text (required)')
  .option('--url <url>', 'Link URL (optional)')
  .option('--title <title>', 'Link title (optional)')
  .option('--description <desc>', 'Link description (optional)')
  .action(async (organizationId: string, options) => {
    try {
      if (!options.text) {
        console.error('Error: --text is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new LinkedInClient(config);
      
      console.log('Posting to company page...\n');
      
      const result = await client.shareAsOrganization(organizationId, {
        text: options.text,
        url: options.url,
        title: options.title,
        description: options.description
      });
      
      console.log('✅ Post published successfully!');
      console.log(`Post ID: ${result.id}`);
      console.log(`Organization: ${organizationId}\n`);
      
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('followers')
  .description('Get company page follower count')
  .argument('<organization-id>', 'Organization/company ID')
  .action(async (organizationId: string) => {
    try {
      const config = loadConfig();
      const client = new LinkedInClient(config);
      
      console.log('Fetching follower count...\n');
      
      const followerCount = await client.getOrganizationFollowerCount(organizationId);
      
      console.log(`Organization ID: ${organizationId}`);
      console.log(`Followers: ${followerCount.toLocaleString()}\n`);
      
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
