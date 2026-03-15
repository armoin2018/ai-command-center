/**
 * MCP Security Manager
 * 
 * Handles SSL/TLS certificate generation and security configuration for MCP server
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { Logger } from '../logger';
import { getPlatformInfo } from '../utils/platformInfo';

const execFileAsync = promisify(execFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

export interface SSLConfig {
    enabled: boolean;
    certPath: string;
    keyPath: string;
    localhostOnly: boolean;
}

export interface SSLCertificate {
    cert: string;
    key: string;
    certPath: string;
    keyPath: string;
}

export class SecurityManager {
    private logger: Logger;
    private certDir: string;

    constructor(logger: Logger, extensionPath: string) {
        this.logger = logger;
        this.certDir = path.join(extensionPath, 'certificates');
    }

    /**
     * Initialize security manager - ensure certificate directory exists
     */
    async initialize(): Promise<void> {
        try {
            if (!await existsAsync(this.certDir)) {
                await mkdirAsync(this.certDir, { recursive: true });
                this.logger.info('Created certificate directory', { component: 'SecurityManager', path: this.certDir });
            }
        } catch (error: any) {
            this.logger.error('Failed to initialize security manager', error);
            throw error;
        }
    }

    /**
     * Get SSL configuration from VS Code settings
     */
    getSSLConfig(): SSLConfig {
        const config = vscode.workspace.getConfiguration('aicc.mcp');
        
        const enabled = config.get<boolean>('ssl.enabled', false);
        const certPath = config.get<string>('ssl.certPath', path.join(this.certDir, 'server.crt'));
        const keyPath = config.get<string>('ssl.keyPath', path.join(this.certDir, 'server.key'));
        const localhostOnly = config.get<boolean>('localhostOnly', true);

        return {
            enabled,
            certPath,
            keyPath,
            localhostOnly
        };
    }

    /**
     * Generate self-signed SSL certificate and private key
     * Uses OpenSSL to create certificates valid for 1 year
     */
    async generateSelfSignedCertificate(commonName: string = 'localhost'): Promise<SSLCertificate> {
        const certPath = path.join(this.certDir, 'server.crt');
        const keyPath = path.join(this.certDir, 'server.key');

        this.logger.info('Generating self-signed SSL certificate', { 
            component: 'SecurityManager',
            commonName,
            certPath,
            keyPath
        });

        try {
            // Check if OpenSSL is available
            try {
                await execFileAsync('openssl', ['version']);
            } catch (error) {
                throw new Error('OpenSSL not found. Please install OpenSSL to generate SSL certificates.');
            }

            // Generate private key (2048-bit RSA)
            await execFileAsync('openssl', ['genrsa', '-out', keyPath, '2048']);
            this.logger.info('Generated private key', { component: 'SecurityManager' });

            // Generate self-signed certificate (valid for 365 days)
            await execFileAsync('openssl', [
                'req', '-new', '-x509', '-key', keyPath, '-out', certPath, '-days', '365',
                '-subj', `/C=US/ST=State/L=City/O=Organization/CN=${commonName}`
            ]);
            this.logger.info('Generated SSL certificate', { component: 'SecurityManager' });

            // Read the generated files
            const cert = await readFileAsync(certPath, 'utf8');
            const key = await readFileAsync(keyPath, 'utf8');

            // Update VS Code configuration with certificate paths
            const config = vscode.workspace.getConfiguration('aicc.mcp');
            await config.update('ssl.certPath', certPath, vscode.ConfigurationTarget.Global);
            await config.update('ssl.keyPath', keyPath, vscode.ConfigurationTarget.Global);

            this.logger.info('SSL certificate generated successfully', {
                component: 'SecurityManager',
                certPath,
                keyPath,
                validDays: 365
            });

            return { cert, key, certPath, keyPath };
        } catch (error: any) {
            this.logger.error('Failed to generate SSL certificate', error);
            throw new Error(`SSL certificate generation failed: ${error.message}`);
        }
    }

    /**
     * Load existing SSL certificate and key from disk
     */
    async loadCertificate(certPath: string, keyPath: string): Promise<SSLCertificate> {
        try {
            this.logger.info('Loading SSL certificate', { 
                component: 'SecurityManager',
                certPath,
                keyPath
            });

            // Check if files exist
            if (!await existsAsync(certPath)) {
                throw new Error(`Certificate file not found: ${certPath}`);
            }
            if (!await existsAsync(keyPath)) {
                throw new Error(`Private key file not found: ${keyPath}`);
            }

            // Read certificate and key
            const cert = await readFileAsync(certPath, 'utf8');
            const key = await readFileAsync(keyPath, 'utf8');

            this.logger.info('SSL certificate loaded successfully', { component: 'SecurityManager' });

            return { cert, key, certPath, keyPath };
        } catch (error: any) {
            this.logger.error('Failed to load SSL certificate', error);
            throw error;
        }
    }

    /**
     * Ensure SSL certificate exists, generate if missing
     */
    async ensureCertificate(): Promise<SSLCertificate> {
        const config = this.getSSLConfig();

        // Check if certificate files exist
        const certExists = await existsAsync(config.certPath);
        const keyExists = await existsAsync(config.keyPath);

        if (certExists && keyExists) {
            this.logger.info('Using existing SSL certificate', { 
                component: 'SecurityManager',
                certPath: config.certPath
            });
            return this.loadCertificate(config.certPath, config.keyPath);
        }

        // Generate new certificate
        this.logger.info('SSL certificate not found, generating new certificate', { 
            component: 'SecurityManager'
        });
        return this.generateSelfSignedCertificate();
    }

    /**
     * Show certificate trust prompt to user
     */
    async promptCertificateTrust(certPath: string): Promise<boolean> {
        const message = `The MCP server uses a self-signed SSL certificate. ` +
            `You may need to trust this certificate in your system.\n\n` +
            `Certificate location: ${certPath}\n\n` +
            `Would you like to view instructions for trusting the certificate?`;

        const choice = await vscode.window.showInformationMessage(
            message,
            'View Instructions',
            'Dismiss'
        );

        if (choice === 'View Instructions') {
            const instructions = this.getTrustInstructions();
            const doc = await vscode.workspace.openTextDocument({
                content: instructions,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
            return true;
        }

        return false;
    }

    /**
     * Get platform-specific instructions for trusting self-signed certificates
     */
    private getTrustInstructions(): string {
        const { isMacOS, isWindows } = getPlatformInfo();

        if (isMacOS) {
            // macOS
            return `# Trust Self-Signed Certificate on macOS

1. Open Keychain Access application
2. Select "System" keychain
3. Drag and drop the certificate file: ${path.join(this.certDir, 'server.crt')}
4. Double-click the certificate
5. Expand "Trust" section
6. Set "When using this certificate" to "Always Trust"
7. Close the window and enter your password

Alternatively, use the command line:
\`\`\`bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${path.join(this.certDir, 'server.crt')}
\`\`\`
`;
        } else if (isWindows) {
            // Windows
            return `# Trust Self-Signed Certificate on Windows

1. Double-click the certificate file: ${path.join(this.certDir, 'server.crt')}
2. Click "Install Certificate"
3. Select "Local Machine" and click "Next"
4. Select "Place all certificates in the following store"
5. Click "Browse" and select "Trusted Root Certification Authorities"
6. Click "Next" and "Finish"
7. Confirm the security warning

Alternatively, use PowerShell (run as Administrator):
\`\`\`powershell
Import-Certificate -FilePath "${path.join(this.certDir, 'server.crt')}" -CertStoreLocation Cert:\\LocalMachine\\Root
\`\`\`
`;
        } else {
            // Linux
            return `# Trust Self-Signed Certificate on Linux

## Ubuntu/Debian:
\`\`\`bash
sudo cp ${path.join(this.certDir, 'server.crt')} /usr/local/share/ca-certificates/
sudo update-ca-certificates
\`\`\`

## Fedora/RHEL/CentOS:
\`\`\`bash
sudo cp ${path.join(this.certDir, 'server.crt')} /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
\`\`\`

## Arch Linux:
\`\`\`bash
sudo cp ${path.join(this.certDir, 'server.crt')} /etc/ca-certificates/trust-source/anchors/
sudo trust extract-compat
\`\`\`
`;
        }
    }

    /**
     * Validate localhost-only configuration
     */
    validateLocalhostOnly(host: string): void {
        const config = this.getSSLConfig();

        if (config.localhostOnly && host !== 'localhost' && host !== '127.0.0.1') {
            throw new Error(
                `MCP server is configured for localhost-only access. ` +
                `Cannot bind to ${host}. Set aicc.mcp.localhostOnly to false to allow external access.`
            );
        }
    }

    /**
     * Get recommended TLS options for Node.js HTTPS server
     */
    getTLSOptions(cert: string, key: string): any {
        return {
            cert,
            key,
            // Enforce TLS 1.2+ for security
            minVersion: 'TLSv1.2',
            // Recommended cipher suites
            ciphers: [
                'ECDHE-RSA-AES128-GCM-SHA256',
                'ECDHE-RSA-AES256-GCM-SHA384',
                'ECDHE-RSA-AES128-SHA256',
                'ECDHE-RSA-AES256-SHA384'
            ].join(':'),
            // Prefer server cipher order
            honorCipherOrder: true
        };
    }

    /**
     * Clean up old certificates
     */
    async cleanup(): Promise<void> {
        try {
            const certPath = path.join(this.certDir, 'server.crt');
            const keyPath = path.join(this.certDir, 'server.key');

            if (await existsAsync(certPath)) {
                await promisify(fs.unlink)(certPath);
                this.logger.info('Removed SSL certificate', { component: 'SecurityManager' });
            }

            if (await existsAsync(keyPath)) {
                await promisify(fs.unlink)(keyPath);
                this.logger.info('Removed private key', { component: 'SecurityManager' });
            }
        } catch (error: any) {
            this.logger.error('Failed to cleanup certificates', error);
        }
    }
}
