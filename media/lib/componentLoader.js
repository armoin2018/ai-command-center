/**
 * Component Loader Utility
 * jQuery-style with library dependency management
 */

class ComponentLoader {
    constructor(basePath = '/media/components') {
        this.basePath = basePath;
        this.loadedComponents = new Map();
        this.loadedStyles = new Set();
        this.librariesReady = false;
        this.libraryLoadPromise = null;
    }

    /**
     * Ensure bundled libraries are loaded before components
     */
    async ensureLibraries() {
        if (this.librariesReady) return Promise.resolve();
        
        if (this.libraryLoadPromise) return this.libraryLoadPromise;
        
        this.libraryLoadPromise = new Promise((resolve) => {
            // Check if libraries are already available
            if (typeof $ !== 'undefined' && typeof _ !== 'undefined') {
                this.librariesReady = true;
                resolve();
                return;
            }
            
            // Wait for library loader event
            if (window.AICC && window.AICC.onLibrariesLoaded) {
                window.AICC.onLibrariesLoaded(() => {
                    this.librariesReady = true;
                    resolve();
                });
            } else {
                // Fallback: listen for event
                document.addEventListener('aicc:libraries-loaded', () => {
                    this.librariesReady = true;
                    resolve();
                }, { once: true });
            }
        });
        
        return this.libraryLoadPromise;
    }

    /**
     * Load a component by name
     * @param {string} componentName - Name of the component folder
     * @param {HTMLElement} container - Container element to inject HTML
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Component instance or API
     */
    async load(componentName, container, options = {}) {
        // Ensure libraries are ready first
        await this.ensureLibraries();
        
        if (this.loadedComponents.has(componentName)) {
            console.log(`Component ${componentName} already loaded`);
            return this.loadedComponents.get(componentName);
        }

        const componentPath = `${this.basePath}/${componentName}`;

        try {
            // Load CSS first
            await this.loadStyles(componentPath);

            // Load HTML
            const html = await this.loadHTML(componentPath);
            if (container) {
                // Use jQuery if available
                if (typeof $ !== 'undefined') {
                    $(container).html(html);
                } else {
                    container.innerHTML = html;
                }
            }

            // Load and execute JavaScript
            const componentInstance = await this.loadScript(componentPath, options);

            this.loadedComponents.set(componentName, componentInstance);
            return componentInstance;

        } catch (error) {
            console.error(`Failed to load component ${componentName}:`, error);
            throw error;
        }
    }

    /**
     * Load component HTML
     */
    async loadHTML(componentPath) {
        const response = await fetch(`${componentPath}/index.html`);
        if (!response.ok) {
            throw new Error(`Failed to load HTML: ${response.statusText}`);
        }
        return response.text();
    }

    /**
     * Load component CSS
     */
    async loadStyles(componentPath) {
        const styleId = `style-${componentPath.replace(/\//g, '-')}`;
        
        if (this.loadedStyles.has(styleId)) {
            return;
        }

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.id = styleId;
            link.rel = 'stylesheet';
            link.href = `${componentPath}/styles.css`;
            
            link.onload = () => {
                this.loadedStyles.add(styleId);
                resolve();
            };
            
            link.onerror = () => {
                reject(new Error(`Failed to load CSS: ${link.href}`));
            };
            
            document.head.appendChild(link);
        });
    }

    /**
     * Load component JavaScript
     */
    async loadScript(componentPath, options = {}) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${componentPath}/script.js`;
            script.async = true;
            
            script.onload = () => {
                // Script loaded, resolve with any exported component class/function
                resolve(options);
            };
            
            script.onerror = () => {
                reject(new Error(`Failed to load script: ${script.src}`));
            };
            
            document.body.appendChild(script);
        });
    }

    /**
     * Unload a component
     */
    unload(componentName) {
        this.loadedComponents.delete(componentName);
    }

    /**
     * Check if component is loaded
     */
    isLoaded(componentName) {
        return this.loadedComponents.has(componentName);
    }
}

// Global instance
window.componentLoader = new ComponentLoader();
