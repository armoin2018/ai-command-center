/**
 * useVSCode Hook
 * 
 * Provides access to VS Code API for WebView messaging
 */

import { useEffect, useRef, useCallback } from 'react';
import { WebViewMessage, VSCodeAPI } from '../types/messages';

export function useVSCode() {
    const vscodeRef = useRef<VSCodeAPI | null>(null);

    // Initialize VS Code API
    if (!vscodeRef.current && typeof window !== 'undefined') {
        vscodeRef.current = window.acquireVsCodeApi();
    }

    /**
     * Post message to VS Code extension
     */
    const postMessage = useCallback((message: WebViewMessage) => {
        if (vscodeRef.current) {
            vscodeRef.current.postMessage(message);
        }
    }, []);

    /**
     * Get persisted state
     */
    const getState = useCallback(() => {
        if (vscodeRef.current) {
            return vscodeRef.current.getState();
        }
        return null;
    }, []);

    /**
     * Set persisted state
     */
    const setState = useCallback((state: any) => {
        if (vscodeRef.current) {
            vscodeRef.current.setState(state);
        }
    }, []);

    /**
     * Listen for messages from extension
     */
    const onMessage = useCallback((handler: (message: any) => void) => {
        const listener = (event: MessageEvent) => {
            handler(event.data);
        };

        window.addEventListener('message', listener);

        return () => {
            window.removeEventListener('message', listener);
        };
    }, []);

    return {
        postMessage,
        getState,
        setState,
        onMessage
    };
}
