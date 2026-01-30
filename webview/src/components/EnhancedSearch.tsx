import React from 'react';
import { TreeNodeData } from '../types/tree';
import './EnhancedSearch.css';

interface EnhancedSearchProps {
    tree: TreeNodeData[];
    onSelectItem: (item: TreeNodeData) => void;
}

interface SearchResult {
    item: TreeNodeData;
    score: number;
    matches: string[];
}

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({ tree, onSelectItem }) => {
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<SearchResult[]>([]);
    const [history, setHistory] = React.useState<string[]>([]);
    const [showHistory, setShowHistory] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem('searchHistory');
        if (stored) {
            setHistory(JSON.parse(stored));
        }
    }, []);

    React.useEffect(() => {
        if (query.trim().length > 0) {
            const searchResults = fuzzySearch(tree, query);
            setResults(searchResults);
        } else {
            setResults([]);
        }
    }, [query, tree]);

    const fuzzySearch = (nodes: TreeNodeData[], searchQuery: string): SearchResult[] => {
        const results: SearchResult[] = [];
        const lowerQuery = searchQuery.toLowerCase();

        const traverse = (node: TreeNodeData) => {
            let score = 0;
            const matches: string[] = [];

            // Search in name
            if (node.title.toLowerCase().includes(lowerQuery)) {
                score += 10;
                matches.push('name');
            }

            // Search in type
            if (node.type.toLowerCase().includes(lowerQuery)) {
                score += 5;
                matches.push('type');
            }

            // Search in status
            if (node.status.toLowerCase().includes(lowerQuery)) {
                score += 5;
                matches.push('status');
            }

            // Search in priority
            if (node.priority?.toLowerCase().includes(lowerQuery)) {
                score += 3;
                matches.push('priority');
            }

            // Search in tags
            if (node.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) {
                score += 7;
                matches.push('tags');
            }

            // Fuzzy matching
            if (matches.length === 0) {
                const fuzzyScore = calculateFuzzyScore(node.title.toLowerCase(), lowerQuery);
                if (fuzzyScore > 0) {
                    score = fuzzyScore;
                    matches.push('fuzzy match');
                }
            }

            if (score > 0) {
                results.push({ item: node, score, matches });
            }

            // Recurse children
            if (node.children) {
                node.children.forEach(traverse);
            }
        };

        nodes.forEach(traverse);
        return results.sort((a, b) => b.score - a.score).slice(0, 20);
    };

    const calculateFuzzyScore = (text: string, query: string): number => {
        let score = 0;
        let queryIndex = 0;

        for (let i = 0; i < text.length && queryIndex < query.length; i++) {
            if (text[i] === query[queryIndex]) {
                score += 1;
                queryIndex++;
            }
        }

        return queryIndex === query.length ? score : 0;
    };

    const highlightMatch = (text: string, query: string): React.ReactNode => {
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);

        if (index === -1) {
            return text;
        }

        return (
            <>
                {text.slice(0, index)}
                <mark className="search-highlight">{text.slice(index, index + query.length)}</mark>
                {text.slice(index + query.length)}
            </>
        );
    };

    const handleSearch = (searchQuery: string) => {
        setQuery(searchQuery);
        setShowHistory(false);

        if (searchQuery.trim().length > 0 && !history.includes(searchQuery)) {
            const newHistory = [searchQuery, ...history].slice(0, 10);
            setHistory(newHistory);
            localStorage.setItem('searchHistory', JSON.stringify(newHistory));
        }
    };

    const handleSelectResult = (result: SearchResult) => {
        onSelectItem(result.item);
        setQuery('');
        setResults([]);
    };

    const handleClearHistory = () => {
        setHistory([]);
        localStorage.removeItem('searchHistory');
    };

    const getTypeIcon = (type: string): string => {
        switch (type) {
            case 'epic': return '🎯';
            case 'story': return '📘';
            case 'task': return '✅';
            default: return '📄';
        }
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'done': return 'green';
            case 'in-progress': return 'blue';
            case 'pending': return 'red';
            default: return 'gray';
        }
    };

    return (
        <div className="enhanced-search">
            <div className="search-input-container">
                <span className="search-icon">🔍</span>
                <input
                    id="enhanced-search-input"
                    ref={inputRef}
                    type="search"
                    className="search-input"
                    placeholder="Search items... (Ctrl/Cmd+F)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowHistory(query.length === 0)}
                    role="searchbox"
                    aria-label="Search planning items"
                />
                {query && (
                    <button
                        id="enhanced-search-clear-btn"
                        className="clear-button"
                        onClick={() => setQuery('')}
                        aria-label="Clear search"
                    >
                        ×
                    </button>
                )}
            </div>

            {showHistory && history.length > 0 && (
                <div className="search-history">
                    <div className="history-header">
                        <span>Recent Searches</span>
                        <button onClick={handleClearHistory} className="clear-history">
                            Clear
                        </button>
                    </div>
                    {history.map((item, index) => (
                        <div
                            key={index}
                            className="history-item"
                            onClick={() => handleSearch(item)}
                        >
                            <span className="history-icon">🕒</span>
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            )}

            {results.length > 0 && (
                <div className="search-results">
                    <div className="results-header">
                        {results.length} result{results.length !== 1 ? 's' : ''}
                    </div>
                    {results.map((result, index) => (
                        <div
                            key={index}
                            className="result-item"
                            onClick={() => handleSelectResult(result)}
                        >
                            <div className="result-main">
                                <span className="result-icon">{getTypeIcon(result.item.type)}</span>
                                <div className="result-content">
                                    <div className="result-name">
                                        {highlightMatch(result.item.title, query)}
                                    </div>
                                    <div className="result-meta">
                                        <span className="result-type">{result.item.type}</span>
                                        <span className={`result-status status-${getStatusColor(result.item.status)}`}>
                                            {result.item.status}
                                        </span>
                                        {result.item.priority && (
                                            <span className="result-priority">{result.item.priority}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="result-score">
                                    Score: {result.score}
                                </div>
                            </div>
                            <div className="result-matches">
                                Matched: {result.matches.join(', ')}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {query && results.length === 0 && (
                <div className="no-results">
                    No results found for "{query}"
                </div>
            )}
        </div>
    );
};
