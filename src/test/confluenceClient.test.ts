/**
 * Unit Tests — ConfluenceClient
 * AICC-0448 Sprint 28: Format conversion, auth validation, sync mapping
 */

import * as assert from 'assert';

// ─── Stubs ──────────────────────────────────────────────────────────

const stubLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
};

const emittedEvents: Array<{ channel: string; data: unknown }> = [];
const stubEventBus = {
    emit: async (channel: string, data: unknown) => {
        emittedEvents.push({ channel, data });
    },
};

// ─── Import ─────────────────────────────────────────────────────────

import { ConfluenceClient } from '../integrations/confluenceClient';

suite('ConfluenceClient', () => {
    let client: ConfluenceClient;

    setup(() => {
        ConfluenceClient.resetInstance();
        client = ConfluenceClient.getInstance();
        (client as any).logger = stubLogger;
        (client as any).eventBus = stubEventBus;
        emittedEvents.length = 0;
    });

    teardown(() => {
        ConfluenceClient.resetInstance();
    });

    // ── markdownToConfluence ────────────────────────────────────

    suite('markdownToConfluence', () => {
        test('converts headings h1-h6', () => {
            const md = '# Heading 1\n## Heading 2\n### Heading 3';
            const html = client.markdownToConfluence(md);
            assert.ok(html.includes('<h1>Heading 1</h1>'));
            assert.ok(html.includes('<h2>Heading 2</h2>'));
            assert.ok(html.includes('<h3>Heading 3</h3>'));
        });

        test('converts bold and italic', () => {
            const md = '**bold text** and *italic text*';
            const html = client.markdownToConfluence(md);
            assert.ok(html.includes('<strong>bold text</strong>'));
            assert.ok(html.includes('<em>italic text</em>'));
        });

        test('converts inline code', () => {
            const md = 'Use `console.log()` for debugging';
            const html = client.markdownToConfluence(md);
            assert.ok(html.includes('<code>console.log()</code>'));
        });

        test('converts fenced code blocks with language', () => {
            const md = '```typescript\nconst x = 1;\n```';
            const html = client.markdownToConfluence(md);
            assert.ok(html.includes('ac:name="code"'));
            assert.ok(html.includes('typescript'));
            assert.ok(html.includes('const x = 1;'));
        });

        test('converts fenced code blocks without language', () => {
            const md = '```\nplain code\n```';
            const html = client.markdownToConfluence(md);
            assert.ok(html.includes('ac:name="code"'));
            assert.ok(html.includes('plain code'));
        });

        test('converts tables', () => {
            const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
            const html = client.markdownToConfluence(md);
            assert.ok(html.includes('<table>'));
            assert.ok(html.includes('<th>'));
            assert.ok(html.includes('<td>'));
        });

        test('converts links', () => {
            const md = '[Click here](https://example.com)';
            const html = client.markdownToConfluence(md);
            assert.ok(html.includes('<a href="https://example.com">Click here</a>'));
        });

        test('converts horizontal rules', () => {
            const md = '---';
            const html = client.markdownToConfluence(md);
            assert.ok(html.includes('<hr />'));
        });
    });

    // ── confluenceToMarkdown ────────────────────────────────────

    suite('confluenceToMarkdown', () => {
        test('converts headings back to markdown', () => {
            const html = '<h1>Title</h1><h2>Subtitle</h2>';
            const md = client.confluenceToMarkdown(html);
            assert.ok(md.includes('# Title'));
            assert.ok(md.includes('## Subtitle'));
        });

        test('converts strong and em to markdown', () => {
            const html = '<strong>bold</strong> and <em>italic</em>';
            const md = client.confluenceToMarkdown(html);
            assert.ok(md.includes('**bold**'));
            assert.ok(md.includes('*italic*'));
        });

        test('converts inline code back', () => {
            const html = 'Use <code>console.log()</code>';
            const md = client.confluenceToMarkdown(html);
            assert.ok(md.includes('`console.log()`'));
        });

        test('converts code blocks back to fenced blocks', () => {
            const html =
                '<ac:structured-macro ac:name="code" ac:schema-version="1">' +
                '<ac:parameter ac:name="language">javascript</ac:parameter>' +
                '<ac:plain-text-body><![CDATA[const x = 1;]]></ac:plain-text-body>' +
                '</ac:structured-macro>';
            const md = client.confluenceToMarkdown(html);
            assert.ok(md.includes('```javascript'));
            assert.ok(md.includes('const x = 1;'));
        });

        test('converts tables back to markdown pipes', () => {
            const html =
                '<table><tbody><tr><th>A</th><th>B</th></tr>' +
                '<tr><td>1</td><td>2</td></tr></tbody></table>';
            const md = client.confluenceToMarkdown(html);
            assert.ok(md.includes('| A | B |'));
            assert.ok(md.includes('| 1 | 2 |'));
            assert.ok(md.includes('---'));
        });

        test('converts links back to markdown', () => {
            const html = '<a href="https://example.com">Link</a>';
            const md = client.confluenceToMarkdown(html);
            assert.ok(md.includes('[Link](https://example.com)'));
        });

        test('converts horizontal rules', () => {
            const html = '<hr />';
            const md = client.confluenceToMarkdown(html);
            assert.ok(md.includes('---'));
        });
    });

    // ── round-trip fidelity ─────────────────────────────────────

    suite('round-trip conversion', () => {
        test('headings survive round-trip', () => {
            const original = '# Title';
            const confluence = client.markdownToConfluence(original);
            const back = client.confluenceToMarkdown(confluence);
            assert.ok(back.includes('# Title'));
        });

        test('bold text survives round-trip', () => {
            const original = '**bold**';
            const confluence = client.markdownToConfluence(original);
            const back = client.confluenceToMarkdown(confluence);
            assert.ok(back.includes('**bold**'));
        });

        test('inline code survives round-trip', () => {
            const original = '`code`';
            const confluence = client.markdownToConfluence(original);
            const back = client.confluenceToMarkdown(confluence);
            assert.ok(back.includes('`code`'));
        });
    });

    // ── auth configuration ──────────────────────────────────────

    suite('configuration', () => {
        test('isConfigured returns false initially', () => {
            assert.strictEqual(client.isConfigured(), false);
        });

        test('isConfigured returns true after configure', () => {
            client.configure({
                siteUrl: 'https://mysite.atlassian.net',
                email: 'user@example.com',
                apiToken: 'token123',
                spaceKey: 'DEV',
            });
            assert.strictEqual(client.isConfigured(), true);
        });

        test('configure strips trailing slashes from URL', () => {
            client.configure({
                siteUrl: 'https://mysite.atlassian.net///',
                email: 'user@example.com',
                apiToken: 'token123',
                spaceKey: 'DEV',
            });
            assert.strictEqual(
                (client as any).config.siteUrl,
                'https://mysite.atlassian.net',
            );
        });

        test('isConfigured false with empty email', () => {
            client.configure({
                siteUrl: 'https://example.com',
                email: '',
                apiToken: 'token',
                spaceKey: 'SP',
            });
            assert.strictEqual(client.isConfigured(), false);
        });
    });
});
