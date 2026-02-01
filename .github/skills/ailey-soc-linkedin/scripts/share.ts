import { Command } from 'commander';
import { LinkedInClient, loadConfig } from './linkedin-client.js';
import * as fs from 'fs';

const program = new Command();

program
  .name('linkedin-share')
  .description('Share content to LinkedIn');

// ============================================================================
// SHARE COMMANDS
// ============================================================================

program
  .command('text')
  .description('Share a text post')
  .argument('<text>', 'Text content to share')
  .option('--visibility <type>', 'Visibility: PUBLIC or CONNECTIONS', 'PUBLIC')
  .action(async (text: string, options) => {
    try {
      const config = loadConfig();
      const client = new LinkedInClient(config);
      
      console.log('Sharing text post...\n');
      
      const visibility = options.visibility.toUpperCase() as 'PUBLIC' | 'CONNECTIONS';
      const result = await client.shareTextPost(text, visibility);
      
      console.log('✅ Post shared successfully!');
      console.log(`Post ID: ${result.id}`);
      console.log(`Visibility: ${visibility}\n`);
      
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('link')
  .description('Share a link/article')
  .option('--url <url>', 'Link URL (required)')
  .option('--text <text>', 'Commentary text', '')
  .option('--title <title>', 'Link title', '')
  .option('--description <desc>', 'Link description', '')
  .option('--visibility <type>', 'Visibility: PUBLIC or CONNECTIONS', 'PUBLIC')
  .action(async (options) => {
    try {
      if (!options.url) {
        console.error('Error: --url is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new LinkedInClient(config);
      
      console.log('Sharing link...\n');
      
      const result = await client.shareLink({
        url: options.url,
        text: options.text,
        title: options.title,
        description: options.description,
        visibility: options.visibility.toUpperCase() as 'PUBLIC' | 'CONNECTIONS'
      });
      
      console.log('✅ Link shared successfully!');
      console.log(`Post ID: ${result.id}`);
      console.log(`URL: ${options.url}\n`);
      
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('image')
  .description('Share an image post')
  .argument('<image-path>', 'Path to image file')
  .option('--text <text>', 'Commentary text', '')
  .option('--visibility <type>', 'Visibility: PUBLIC or CONNECTIONS', 'PUBLIC')
  .action(async (imagePath: string, options) => {
    try {
      if (!fs.existsSync(imagePath)) {
        console.error(`Error: Image file not found: ${imagePath}`);
        process.exit(1);
      }

      const config = loadConfig();
      const client = new LinkedInClient(config);
      
      console.log('Uploading image...');
      console.log('This may take a moment...\n');
      
      const visibility = options.visibility.toUpperCase() as 'PUBLIC' | 'CONNECTIONS';
      const result = await client.shareImage(imagePath, options.text, visibility);
      
      console.log('✅ Image shared successfully!');
      console.log(`Post ID: ${result.id}`);
      console.log(`Visibility: ${visibility}\n`);
      
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
