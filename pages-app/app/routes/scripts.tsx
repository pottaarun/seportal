import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";
import { GroupSelector } from "../components/GroupSelector";
import { getRelativeTime } from "../lib/timeUtils";

export function meta() {
  return [
    { title: "Scripts - SolutionHub" },
    { name: "description", content: "Code snippets and automation scripts" },
  ];
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    api: '\u{1F511}', automation: '\u{1F680}', database: '\u{1F5C4}\uFE0F',
    security: '\u{1F6E1}\uFE0F', utility: '\u{1F527}'
  };
  return icons[category] || '\u{1F4BB}';
}

export default function Scripts() {
  const { isAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [products, setProducts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('action') === 'share';
    }
    return false;
  });
  const [newScript, setNewScript] = useState({
    name: "", language: "javascript", category: "api", description: "",
    author: "", code: "", productId: "", targetGroups: ['all'] as string[]
  });
  const [scripts, setScripts] = useState<any[]>([]);
  const [likedScripts, setLikedScripts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        const userEmail = localStorage.getItem('seportal_user') || 'anonymous';
        const [scriptsData, productsData] = await Promise.all([api.scripts.getAll(), api.products.getAll()]);
        setScripts(scriptsData);
        setProducts(Array.isArray(productsData) ? productsData : []);
        const likedIds = await api.scripts.getUserLikes(userEmail);
        setLikedScripts(new Set(likedIds));
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, []);

  const handleLike = async (scriptId: string) => {
    const userEmail = localStorage.getItem('seportal_user') || 'anonymous';
    try {
      await api.scripts.like(scriptId, userEmail);
      const data = await api.scripts.getAll();
      setScripts(data);
      const likedIds = await api.scripts.getUserLikes(userEmail);
      setLikedScripts(new Set(likedIds));
    } catch (e) {
      console.error('Error liking script:', e);
    }
  };

  const handleCopyCode = async (scriptId: string, code: string) => {
    await api.scripts.incrementUses(scriptId);
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  const deleteScript = async (scriptId: string) => {
    if (window.confirm('Are you sure you want to delete this script?')) {
      try {
        await api.scripts.delete(scriptId);
        setScripts(prev => prev.filter(s => s.id !== scriptId));
      } catch (e) {
        console.error('Error deleting script:', e);
        alert('Failed to delete script');
      }
    }
  };

  const filteredScripts = scripts
    .filter((script) => {
      const matchesSearch = script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           script.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === "all" || script.category === filter;
      const matchesProduct = productFilter === "all" ||
                            (productFilter === "none" && !script.productId && !script.product_id) ||
                            script.productId === productFilter || script.product_id === productFilter;
      return matchesSearch && matchesFilter && matchesProduct;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'likes': return b.likes - a.likes;
        case 'uses': return (b.uses || 0) - (a.uses || 0);
        case 'date': return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
        default: return 0;
      }
    });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Code Scripts</h2>
          <p className="page-subtitle">Reusable code snippets and automation tools</p>
        </div>
        <button onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
          Share Script
        </button>
      </div>

      <div className="search-box">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input type="text" className="search-input" placeholder="Search scripts..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <div className="filter-buttons">
            {['all', 'api', 'automation', 'database', 'security'].map(f => (
              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All Scripts' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Sort:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-select"
              style={{ padding: '6px 10px', fontSize: '12px', minWidth: '130px', width: 'auto' }}>
              <option value="date">Date Added</option>
              <option value="likes">Most Liked</option>
              <option value="uses">Most Used</option>
            </select>
          </div>
        </div>

        {products.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Product
            </div>
            <div className="filter-buttons">
              <button className={`filter-btn ${productFilter === "all" ? "active" : ""}`} onClick={() => setProductFilter("all")}>All</button>
              <button className={`filter-btn ${productFilter === "none" ? "active" : ""}`} onClick={() => setProductFilter("none")}>Unlinked</button>
              {products.map((p: any) => (
                <button key={p.id} className={`filter-btn ${productFilter === p.id ? "active" : ""}`} onClick={() => setProductFilter(p.id)}>{p.name}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredScripts.map((script, index) => (
          <div key={script.id} className="card animate-in" style={{ animationDelay: `${index * 0.04}s` }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '14px', marginBottom: '14px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(0,81,195,0.1), rgba(0,81,195,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0,
              }}>
                {script.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontFamily: "'DM Serif Display', serif" }}>{script.name}</h3>
                  <span className="badge badge-gray" style={{ fontSize: '11px', flexShrink: 0 }}>{script.language}</span>
                </div>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px', maxWidth: 'none' }}>{script.description}</p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                  <span>by {script.author}</span>
                  <span>{script.likes} likes</span>
                  <span>{script.uses} uses</span>
                  <span>{script.createdAt ? getRelativeTime(script.createdAt) : script.date}</span>
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', padding: '14px',
              fontFamily: 'Monaco, Consolas, "Courier New", monospace', fontSize: '13px',
              overflow: 'auto', marginBottom: '14px',
            }}>
              <pre style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{script.code}</pre>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => handleCopyCode(script.id, script.code)} className="btn-secondary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copy ({script.uses || 0})
              </button>
              <button onClick={() => handleLike(script.id)}
                className={`btn-sm ${likedScripts.has(script.id) ? 'heart-btn liked' : 'btn-secondary'}`}>
                {likedScripts.has(script.id) ? '\u2764' : '\u2661'} {script.likes}
              </button>
              {isAdmin && (
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteScript(script.id); }}
                  type="button" className="btn-danger btn-sm">Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredScripts.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <p className="empty-state-text">No scripts found</p>
          <p className="empty-state-sub">Try adjusting your filters or share a new script</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share a Script</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&#215;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const scriptData = {
                id: Date.now().toString(), name: newScript.name, language: newScript.language,
                category: newScript.category, description: newScript.description, author: newScript.author,
                code: newScript.code, productId: newScript.productId, likes: 0, uses: 0, date: 'Just now',
                createdAt: new Date().toISOString(), icon: getCategoryIcon(newScript.category), targetGroups: newScript.targetGroups
              };
              try {
                await api.scripts.create(scriptData);
                setScripts(prev => [scriptData, ...prev]);
                setShowModal(false);
                setNewScript({ name: "", language: "javascript", category: "api", description: "", author: "", code: "", productId: "", targetGroups: ['all'] });
              } catch (error) {
                console.error('Error sharing script:', error);
                alert('Failed to share script');
              }
            }}>
              <div className="form-group">
                <label htmlFor="name">Script Name</label>
                <input id="name" type="text" className="form-input" value={newScript.name}
                  onChange={(e) => setNewScript({ ...newScript, name: e.target.value })} placeholder="e.g., Cloudflare API Auth Helper" required />
              </div>
              <div className="form-group">
                <label htmlFor="author">Your Name</label>
                <input id="author" type="text" className="form-input" value={newScript.author}
                  onChange={(e) => setNewScript({ ...newScript, author: e.target.value })} placeholder="e.g., John Doe" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label htmlFor="language">Language</label>
                  <select id="language" className="form-select" value={newScript.language}
                    onChange={(e) => setNewScript({ ...newScript, language: e.target.value })}>
                    <option value="javascript">JavaScript</option><option value="typescript">TypeScript</option>
                    <option value="python">Python</option><option value="bash">Bash</option>
                    <option value="sql">SQL</option><option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select id="category" className="form-select" value={newScript.category}
                    onChange={(e) => setNewScript({ ...newScript, category: e.target.value })}>
                    <option value="api">API</option><option value="automation">Automation</option>
                    <option value="database">Database</option><option value="security">Security</option>
                    <option value="utility">Utility</option>
                  </select>
                </div>
              </div>
              {products.length > 0 && (
                <div className="form-group">
                  <label htmlFor="product">Product (optional)</label>
                  <select id="product" className="form-select" value={newScript.productId}
                    onChange={(e) => setNewScript({ ...newScript, productId: e.target.value })}>
                    <option value="">-- No specific product --</option>
                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea id="description" className="form-input" value={newScript.description}
                  onChange={(e) => setNewScript({ ...newScript, description: e.target.value })}
                  placeholder="Brief description of what this script does" required rows={3} style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>
              <GroupSelector selectedGroups={newScript.targetGroups} onChange={(groups) => setNewScript({ ...newScript, targetGroups: groups })} />
              <div className="form-group">
                <label htmlFor="code">Code</label>
                <textarea id="code" className="form-input" value={newScript.code}
                  onChange={(e) => setNewScript({ ...newScript, code: e.target.value })}
                  placeholder="Paste your code here..." required rows={10}
                  style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: '13px', minHeight: '200px', resize: 'vertical' }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit">Share Script</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page-footer">SolutionHub by Cloudflare SE Team</div>
    </div>
  );
}
