import { useState, useEffect, useRef } from 'react';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'asset' | 'script' | 'event' | 'shoutout' | 'poll' | 'announcement' | 'competition';
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

  // Load real data from API for fallback
  const [fallbackContent, setFallbackContent] = useState<SearchResult[]>([]);

  // Function to load search index
  const loadSearchIndex = async () => {
      try {
        const { api } = await import('../lib/api');
        const [assets, urlAssets, scripts, events, shoutouts, polls, announcements, competitions] = await Promise.all([
          api.fileAssets.getAll(),
          api.urlAssets.getAll(),
          api.scripts.getAll(),
          api.events.getAll(),
          api.shoutouts.getAll(),
          api.polls.getAll(),
          api.announcements.getAll(),
          api.competitions.getAll(),
        ]);

        const searchIndex: SearchResult[] = [
          ...urlAssets.map((a: any) => ({
            id: `asset-${a.id}`,
            title: a.title,
            description: `${a.description} ${a.title}`,
            type: 'asset' as const,
            url: '/assets',
            icon: a.icon || '📦',
            metadata: `${a.category}, ${Array.isArray(a.tags) ? a.tags.join(', ') : a.tags || ''}, owner: ${a.owner || ''}, URL: ${a.url || ''}`
          })),
          ...assets.map((a: any) => ({
            id: `file-${a.id}`,
            title: a.name,
            description: `${a.description || ''} ${a.name}`,
            type: 'asset' as const,
            url: '/assets',
            icon: a.icon || '📄',
            metadata: `${a.category}, ${a.name}, ${a.description || ''}, File, owner: ${a.owner || ''}, type: ${a.type || ''}`
          })),
          ...scripts.map((s: any) => ({
            id: `script-${s.id}`,
            title: s.name || s.title,
            description: `${s.description} ${s.name || s.title}`,
            type: 'script' as const,
            url: '/scripts',
            icon: s.icon || '💻',
            metadata: `${s.language}, ${s.category}, ${s.name || s.title}, author: ${s.author || ''}, code: ${s.code ? s.code.substring(0, 300) : ''}`
          })),
          ...events.map((e: any) => ({
            id: `event-${e.id}`,
            title: e.title,
            description: `${e.description} ${e.title}`,
            type: 'event' as const,
            url: '/events',
            icon: e.icon || '📅',
            metadata: `${e.type}, ${e.title}, ${e.date}, ${e.location}, ${e.description || ''}`
          })),
          ...shoutouts.map((s: any) => ({
            id: `shoutout-${s.id}`,
            title: `${s.to_user} - ${s.category}`,
            description: `${s.message} To: ${s.to_user} From: ${s.from_user}`,
            type: 'shoutout' as const,
            url: '/shoutouts',
            icon: s.icon || '🎉',
            metadata: `${s.category}, from ${s.from_user}, to ${s.to_user}, ${s.date}, ${s.message}`
          })),
          ...polls.map((p: any) => ({
            id: `poll-${p.id}`,
            title: p.question,
            description: `${p.question} Options: ${p.options?.map((o: any) => o.text).join(', ')}`,
            type: 'poll' as const,
            url: '/polls',
            icon: '📊',
            metadata: `${p.category}, ${p.question}, ${p.options?.map((o: any) => o.text).join(' ')} ${p.totalVotes || 0} votes, ${p.date}`
          })),
          ...announcements.map((a: any) => ({
            id: `announcement-${a.id}`,
            title: a.title,
            description: `${a.message} ${a.title}`,
            type: 'announcement' as const,
            url: '/announcements',
            icon: '📢',
            metadata: `${a.priority}, ${a.title}, by ${a.author}, ${a.date}, ${a.message}`
          })),
          ...competitions.map((c: any) => ({
            id: `competition-${c.id}`,
            title: c.title,
            description: `${c.description} ${c.title}`,
            type: 'competition' as const,
            url: '/competitions',
            icon: '🏆',
            metadata: `${c.status}, ${c.category}, ${c.title}, prize: ${c.prize || 'N/A'}, rules: ${c.rules || ''}, ${c.participants || 0} participants`
          }))
        ];

        console.log('[SEARCH DEBUG] Loaded search index:', searchIndex.length, 'items');
        console.log('[SEARCH DEBUG] File assets:', searchIndex.filter(i => i.id.startsWith('file-')));
        console.log('[SEARCH DEBUG] All items:', searchIndex);
        setFallbackContent(searchIndex);
      } catch (error) {
        console.error('Error loading search index:', error);
      }
    };

  // Load on mount
  useEffect(() => {
    loadSearchIndex();
  }, []);

  // Reload search index when search is opened to get latest data
  useEffect(() => {
    if (isOpen) {
      console.log('[SEARCH DEBUG] Search opened, refreshing index...');
      loadSearchIndex();
    }
  }, [isOpen]);

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

      // Direct client-side search (AI endpoint removed for reliability)
      const query = searchQuery.toLowerCase();
      console.log('[SEARCH DEBUG] Searching for:', query);
      console.log('[SEARCH DEBUG] Searching through:', fallbackContent.length, 'items');

      const searchResults = fallbackContent.map(item => {
          let score = 0;
          const titleLower = item.title.toLowerCase();
          const descLower = item.description.toLowerCase();
          const metaLower = item.metadata?.toLowerCase() || '';

          // Exact title match - highest priority
          if (titleLower === query) {
            score += 100;
          }
          // Title starts with query - high priority
          else if (titleLower.startsWith(query)) {
            score += 50;
          }
          // Title contains query - medium priority
          else if (titleLower.includes(query)) {
            score += 30;
          }

          // Description contains query
          if (descLower.includes(query)) {
            score += 20;
          }

          // Metadata contains query
          if (metaLower.includes(query)) {
            score += 10;
          }

          // Word-based matching for better relevance
          const queryWords = query.split(' ').filter(w => w.length > 2);
          queryWords.forEach(word => {
            if (titleLower.includes(word)) score += 5;
            if (descLower.includes(word)) score += 2;
          });

          return { ...item, score };
      }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

      console.log('[SEARCH DEBUG] Search results with scores:', searchResults.map(r => ({ title: r.title, score: r.score })));
      console.log('[SEARCH DEBUG] Filtered results:', searchResults.length, 'matches');
      setResults(searchResults.slice(0, 12));
      setSelectedIndex(0);
      setIsSearching(false);
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
      case 'script': return '#10B981';
      case 'event': return 'var(--cf-orange)';
      case 'shoutout': return '#8B5CF6';
      case 'poll': return '#F59E0B';
      case 'announcement': return '#EF4444';
      case 'competition': return '#EC4899';
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
              <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M80 60L70 40L60 60H80Z" fill={isSearching ? "#F6821F" : "#666"}/>
                <path d="M80 40L70 20L60 40H80Z" fill={isSearching ? "#F6821F" : "#666"}/>
                <path d="M60 60L50 40L40 60H60Z" fill={isSearching ? "#F6821F" : "#666"}/>
              </svg>
              <input
                type="text"
                placeholder="Search everything: assets, scripts, events, polls, announcements..."
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
                  fontSize: '15px',
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

            {query && results.length === 0 && !isSearching && (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>No results found for "{query}"</p>
                <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  We searched through all:
                </p>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center',
                  marginTop: '12px',
                  fontSize: '11px'
                }}>
                  <span style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>📦 Assets</span>
                  <span style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>💻 Scripts</span>
                  <span style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>📅 Events</span>
                  <span style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>🎉 Shoutouts</span>
                  <span style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>📊 Polls</span>
                  <span style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>📢 Announcements</span>
                  <span style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>🏆 Competitions</span>
                </div>
                <p style={{ margin: '16px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  Try different keywords or check spelling
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
                <p style={{ margin: '0 0 12px 0' }}>Search everything in the portal:</p>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.8 }}>
                  <li>📦 Assets & 💻 Scripts - by name, tags, category, author</li>
                  <li>📅 Events & 📢 Announcements - by title, description, location</li>
                  <li>📊 Polls & 🏆 Competitions - by question, options, category</li>
                  <li>🎉 Shoutouts - by recipient, sender, message</li>
                  <li>Use ↑↓ arrows to navigate • Press Enter to open</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
