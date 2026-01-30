/**
 * Bundled Libraries Loader
 * 
 * Loads all bundled libraries (jQuery, Bootstrap, Lodash, Moment, Chart.js, Tabulator, Tagify)
 * in the correct order for use in media components
 */

(function() {
    'use strict';

    // Track loading state
    window.AICC = window.AICC || {};
    window.AICC.librariesLoaded = false;
    window.AICC.librariesLoading = false;
    window.AICC.libraryCallbacks = [];

    /**
     * Load a script dynamically
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Maintain order
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    /**
     * Load a stylesheet dynamically
     */
    function loadStylesheet(href) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            const existing = document.querySelector(`link[href="${href}"]`);
            if (existing) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
            document.head.appendChild(link);
        });
    }

    /**
     * Load all bundled libraries
     */
    async function loadBundledLibraries() {
        if (window.AICC.librariesLoaded) {
            console.log('Libraries already loaded');
            return;
        }

        if (window.AICC.librariesLoading) {
            console.log('Libraries currently loading, waiting...');
            return new Promise((resolve) => {
                window.AICC.libraryCallbacks.push(resolve);
            });
        }

        window.AICC.librariesLoading = true;
        console.log('Loading bundled libraries...');

        const basePath = '/media/webview';

        try {
            // Load scripts in order (important for dependencies)
            // Bootstrap bundle includes jQuery
            await loadScript(`${basePath}/bootstrap.bundle.js`);
            console.log('✓ Bootstrap + jQuery loaded');

            // Load utility libraries
            await loadScript(`${basePath}/utils.bundle.js`);
            console.log('✓ Lodash + Moment loaded');

            // Load Tagify
            await loadScript(`${basePath}/tagify.bundle.js`);
            console.log('✓ Tagify loaded');

            // Load Tabulator
            await loadScript(`${basePath}/tabulator.bundle.js`);
            console.log('✓ Tabulator loaded');

            // Load Chart.js
            await loadScript(`${basePath}/charts.bundle.js`);
            console.log('✓ Chart.js loaded');

            // Verify libraries are available
            if (typeof jQuery === 'undefined' || typeof $ === 'undefined') {
                throw new Error('jQuery failed to load');
            }
            if (typeof _ === 'undefined') {
                throw new Error('Lodash failed to load');
            }
            if (typeof moment === 'undefined') {
                throw new Error('Moment.js failed to load');
            }
            if (typeof Tagify === 'undefined') {
                throw new Error('Tagify failed to load');
            }
            if (typeof Tabulator === 'undefined') {
                throw new Error('Tabulator failed to load');
            }
            if (typeof Chart === 'undefined') {
                throw new Error('Chart.js failed to load');
            }

            // Make jQuery available globally (if not already)
            window.$ = window.jQuery = jQuery;
            window._ = _;
            window.moment = moment;
            window.Tagify = Tagify;
            window.Tabulator = Tabulator;
            window.Chart = Chart;

            window.AICC.librariesLoaded = true;
            window.AICC.librariesLoading = false;

            console.log('✅ All bundled libraries loaded successfully');
            console.log('Available: jQuery, $, Bootstrap, Lodash (_), Moment, Tagify, Tabulator, Chart.js');

            // Execute any waiting callbacks
            window.AICC.libraryCallbacks.forEach(cb => cb());
            window.AICC.libraryCallbacks = [];

            // Dispatch event
            window.dispatchEvent(new CustomEvent('aicc:libraries-loaded'));

        } catch (error) {
            console.error('Failed to load bundled libraries:', error);
            window.AICC.librariesLoading = false;
            throw error;
        }
    }

    /**
     * Wait for libraries to be loaded
     */
    function waitForLibraries() {
        return new Promise((resolve) => {
            if (window.AICC.librariesLoaded) {
                resolve();
            } else {
                window.addEventListener('aicc:libraries-loaded', () => resolve(), { once: true });
            }
        });
    }

    /**
     * Execute callback when libraries are loaded
     */
    function onLibrariesLoaded(callback) {
        if (window.AICC.librariesLoaded) {
            callback();
        } else {
            window.addEventListener('aicc:libraries-loaded', callback, { once: true });
        }
    }

    // Expose API
    window.AICC.loadLibraries = loadBundledLibraries;
    window.AICC.waitForLibraries = waitForLibraries;
    window.AICC.onLibrariesLoaded = onLibrariesLoaded;

    // Auto-load on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadBundledLibraries().catch(console.error);
        });
    } else {
        loadBundledLibraries().catch(console.error);
    }

})();
