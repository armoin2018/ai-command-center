/**
 * Error Boundary Component
 * 
 * Catches React errors and provides graceful recovery
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
    children: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('ErrorBoundary caught error:', error, errorInfo);
        
        this.setState({
            error,
            errorInfo
        });

        // Notify parent component
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Report to extension
        if (typeof window !== 'undefined' && (window as any).acquireVsCodeApi) {
            const vscode = (window as any).acquireVsCodeApi();
            vscode.postMessage({
                type: 'error',
                payload: {
                    message: error.message,
                    stack: error.stack,
                    componentStack: errorInfo.componentStack
                }
            });
        }
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    handleReload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="error-container">
                        <div className="error-icon">⚠️</div>
                        <h1>Oops! Something went wrong</h1>
                        <p className="error-message">
                            The application encountered an unexpected error.
                        </p>

                        {this.state.error && (
                            <details className="error-details">
                                <summary>Error Details</summary>
                                <div className="error-content">
                                    <div className="error-section">
                                        <strong>Error Message:</strong>
                                        <pre>{this.state.error.message}</pre>
                                    </div>
                                    
                                    {this.state.error.stack && (
                                        <div className="error-section">
                                            <strong>Stack Trace:</strong>
                                            <pre>{this.state.error.stack}</pre>
                                        </div>
                                    )}
                                    
                                    {this.state.errorInfo?.componentStack && (
                                        <div className="error-section">
                                            <strong>Component Stack:</strong>
                                            <pre>{this.state.errorInfo.componentStack}</pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        <div className="error-actions">
                            <button className="btn-primary" onClick={this.handleReset}>
                                Try Again
                            </button>
                            <button className="btn-secondary" onClick={this.handleReload}>
                                Reload Page
                            </button>
                        </div>

                        <div className="error-help">
                            <p>If the problem persists:</p>
                            <ul>
                                <li>Check the VS Code Developer Console for more details</li>
                                <li>Try restarting VS Code</li>
                                <li>Report this issue on GitHub with the error details above</li>
                            </ul>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
