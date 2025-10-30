import { useState, useEffect, useRef } from 'react';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'asset' | 'script' | 'event' | 'shoutout';
  url: string;
  icon: string;
  metadata?: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const SEARCH_API = 'https://seportal-search-ai.arunpotta1024.workers.dev/search';

  // Fallback data for offline mode
  const fallbackContent: SearchResult[] = [
    // Assets
    { id: 'a1', title: 'Cloudflare Workers Logo', description: 'Official Workers logo in SVG format', type: 'asset', url: '/assets', icon: '🖼️', metadata: 'SVG, Logo, Branding' },
    { id: 'a2', title: 'API Documentation', description: 'Complete REST API reference guide', type: 'asset', url: '/assets', icon: '📄', metadata: 'PDF, Documentation' },
    { id: 'a3', title: 'Architecture Diagram', description: 'System architecture overview', type: 'asset', url: '/assets', icon: '📊', metadata: 'PNG, Architecture' },

    // Scripts
    { id: 's1', title: 'Cloudflare API Auth Helper', description: 'Quick authentication setup for Cloudflare API calls', type: 'script', url: '/scripts', icon: '🔑', metadata: 'JavaScript, API' },
    { id: 's2', title: 'Worker Deployment Script', description: 'Automated deployment for multiple Workers', type: 'script', url: '/scripts', icon: '🚀', metadata: 'Bash, Automation' },
    { id: 's3', title: 'D1 Query Builder', description: 'Type-safe D1 query builder utility', type: 'script', url: '/scripts', icon: '🗄️', metadata: 'TypeScript, Database' },
    { id: 's4', title: 'Rate Limiter Middleware', description: 'Simple rate limiting for Workers', type: 'script', url: '/scripts', icon: '🛡️', metadata: 'TypeScript, Security' },

    // Events
    { id: 'e1', title: 'SE Team Sync', description: 'Monthly knowledge sharing and team updates', type: 'event', url: '/events', icon: '👥', metadata: 'Meeting, Tomorrow' },
    { id: 'e2', title: 'Cloudflare Connect 2025', description: 'Annual Cloudflare customer and partner conference', type: 'event', url: '/events', icon: '🎪', metadata: 'Conference, Mar 2025' },
    { id: 'e3', title: 'Demo Friday', description: 'Weekly demo session - show off your wins!', type: 'event', url: '/events', icon: '🎬', metadata: 'Demo, Friday' },
    { id: 'e4', title: 'API Workshop', description: 'Hands-on Cloudflare API integration workshop', type: 'event', url: '/events', icon: '🛠️', metadata: 'Workshop, Next Week' },

    // Shoutouts
    { id: 'sh1', title: 'Sarah Park - Demo Excellence', description: 'Crushed the customer demo today!', type: 'shoutout', url: '/shoutouts', icon: '🏆', metadata: 'Achievement, Mike Chen' },
    { id: 'sh2', title: 'Jordan Lee - Automation Hero', description: 'New automation script saved 10+ hours', type: 'shoutout', url: '/shoutouts', icon: '💪', metadata: 'Helpful, Alex Kumar' },
  ];

  // AI-powered semantic search using Workers AI
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Debounce search requests
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(SEARCH_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: searchQuery }),
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setResults(data.results || []);
        setSelectedIndex(0);
        setIsSearching(false);
      } catch (error) {
        console.error('Search error, falling back to client-side search:', error);
        // Fallback to client-side search
        const query = searchQuery.toLowerCase();
        const searchResults = fallbackContent.filter(item => {
          const titleMatch = item.title.toLowerCase().includes(query);
          const descMatch = item.description.toLowerCase().includes(query);
          const metaMatch = item.metadata?.toLowerCase().includes(query);
          return titleMatch || descMatch || metaMatch;
        });
        setResults(searchResults.slice(0, 8));
        setSelectedIndex(0);
        setIsSearching(false);
      }
    }, 300); // 300ms debounce
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }

      // Arrow navigation
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % results.length);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        }
        if (e.key === 'Enter' && results[selectedIndex]) {
          e.preventDefault();
          window.location.href = results[selectedIndex].url;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'var(--cf-blue)';
      case 'script': return 'var(--success)';
      case 'event': return 'var(--cf-orange)';
      case 'shoutout': return '#F59E0B';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div ref={searchRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          minWidth: '200px',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔍</span>
          <span>Search...</span>
        </div>
        <kbd style={{
          background: 'var(--bg-secondary)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          border: '1px solid var(--border-color)'
        }}>⌘K</kbd>
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '15vh',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '600px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>{isSearching ? '⚡' : '🔍'}</span>
              <input
                type="text"
                placeholder="AI-powered semantic search..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  performSearch(e.target.value);
                }}
                autoFocus
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}
              />
              {isSearching && (
                <span style={{
                  fontSize: '11px',
                  color: 'var(--cf-blue)',
                  background: `var(--cf-blue)20`,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontWeight: '600'
                }}>AI</span>
              )}
              <span style={{
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                background: 'var(--bg-tertiary)',
                padding: '4px 8px',
                borderRadius: '6px'
              }}>ESC</span>
            </div>

            {results.length > 0 && (
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '8px'
              }}>
                {results.map((result, index) => (
                  <a
                    key={result.id}
                    href={result.url}
                    style={{
                      display: 'flex',
                      alignItems: 'start',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      background: index === selectedIndex ? 'var(--bg-tertiary)' : 'transparent',
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      border: index === selectedIndex ? '2px solid var(--cf-blue)' : '2px solid transparent'
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span style={{ fontSize: '24px' }}>{result.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}>{result.title}</h4>
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: `${getTypeColor(result.type)}20`,
                          color: getTypeColor(result.type),
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>{result.type}</span>
                      </div>
                      <p style={{
                        margin: '0 0 4px 0',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.4
                      }}>{result.description}</p>
                      {result.metadata && (
                        <p style={{
                          margin: 0,
                          fontSize: '11px',
                          color: 'var(--text-tertiary)'
                        }}>{result.metadata}</p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}

            {query && results.length === 0 && (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤷</div>
                <p style={{ margin: 0, fontSize: '14px' }}>No results found for "{query}"</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  Try searching for assets, scripts, events, or shoutouts
                </p>
              </div>
            )}

            {!query && (
              <div style={{
                padding: '24px',
                fontSize: '12px',
                color: 'var(--text-tertiary)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  color: 'var(--cf-blue)'
                }}>
                  <span style={{ fontSize: '16px' }}>⚡</span>
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>Powered by Cloudflare Workers AI</span>
                </div>
                <p style={{ margin: '0 0 12px 0' }}>Quick tips:</p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>Semantic search understands context and meaning</li>
                  <li>Try "deployment automation" or "security docs"</li>
                  <li>Use ↑↓ arrows to navigate results</li>
                  <li>Press Enter to open selected item</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
