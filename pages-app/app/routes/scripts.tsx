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
    name: "",
    language: "javascript",
    category: "api",
    description: "",
    author: "",
    code: "",
    productId: "",
    targetGroups: ['all'] as string[]
  });

  const defaultScripts = [
    {
      id: '1',
      name: 'Cloudflare API Auth Helper',
      language: 'javascript',
      category: 'api',
      description: 'Quick authentication setup for Cloudflare API calls',
      author: 'Mike Chen',
      likes: 24,
      uses: 67,
      date: '1 week ago',
      icon: '🔑',
      code: `const API_TOKEN = process.env.CF_API_TOKEN;
const headers = {
  'Authorization': \`Bearer \${API_TOKEN}\`,
  'Content-Type': 'application/json'
};`
    },
    {
      id: '2',
      name: 'Worker Deployment Script',
      language: 'bash',
      category: 'automation',
      description: 'Automated deployment for multiple Workers',
      author: 'Sarah Park',
      likes: 31,
      uses: 45,
      date: '3 days ago',
      icon: '🚀',
      code: `#!/bin/bash
for worker in workers/*; do
  cd $worker && wrangler deploy
done`
    },
    {
      id: '3',
      name: 'D1 Query Builder',
      language: 'typescript',
      category: 'database',
      description: 'Type-safe D1 query builder utility',
      author: 'Alex Kumar',
      likes: 19,
      uses: 38,
      date: '5 days ago',
      icon: '🗄️',
      code: `export const queryBuilder = (db: D1Database) => ({
  select: (table: string) => db.prepare(\`SELECT * FROM \${table}\`)
});`
    },
    {
      id: '4',
      name: 'Rate Limiter Middleware',
      language: 'typescript',
      category: 'security',
      description: 'Simple rate limiting for Workers',
      author: 'Jordan Lee',
      likes: 42,
      uses: 91,
      date: '2 days ago',
      icon: '🛡️',
      code: `export async function rateLimit(request, env) {
  const key = new URL(request.url).pathname;
  const count = await env.KV.get(key);
  if (count > 100) throw new Error('Rate limit');
}`
    },
  ];

  const [scripts, setScripts] = useState<any[]>([]);
  const [likedScripts, setLikedScripts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        const userEmail = localStorage.getItem('seportal_user') || 'anonymous';

        // Load scripts and products
        const [scriptsData, productsData] = await Promise.all([
          api.scripts.getAll(),
          api.products.getAll()
        ]);
        setScripts(scriptsData);
        setProducts(Array.isArray(productsData) ? productsData : []);

        // Load user's likes from database
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

      // Reload scripts and likes from database
      const data = await api.scripts.getAll();
      setScripts(data);

      // Reload user's likes from database
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
    const confirmed = window.confirm('Are you sure you want to delete this script?');
    if (confirmed) {
      try {
        await api.scripts.delete(scriptId);
        setScripts(prev => prev.filter(script => script.id !== scriptId));
        alert('Script deleted successfully!');
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
                            script.productId === productFilter ||
                            script.product_id === productFilter;
      return matchesSearch && matchesFilter && matchesProduct;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'likes':
          return b.likes - a.likes;
        case 'uses':
          return (b.uses || 0) - (a.uses || 0);
        case 'date':
          return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
        default:
          return 0;
      }
    });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>💻 Code Scripts</h2>
          <p>Reusable code snippets and automation tools</p>
        </div>
        <button onClick={() => setShowModal(true)}>+ Share Script</button>
      </div>

      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search scripts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div className="filter-buttons">
            <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
              All Scripts
            </button>
            <button className={`filter-btn ${filter === "api" ? "active" : ""}`} onClick={() => setFilter("api")}>
              API
            </button>
            <button className={`filter-btn ${filter === "automation" ? "active" : ""}`} onClick={() => setFilter("automation")}>
              Automation
            </button>
            <button className={`filter-btn ${filter === "database" ? "active" : ""}`} onClick={() => setFilter("database")}>
              Database
            </button>
            <button className={`filter-btn ${filter === "security" ? "active" : ""}`} onClick={() => setFilter("security")}>
              Security
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '400' }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select"
              style={{ padding: '8px 12px', fontSize: '12px', minWidth: '140px' }}
            >
              <option value="date">Date Added</option>
              <option value="likes">Most Liked</option>
              <option value="uses">Most Used</option>
            </select>
          </div>
        </div>

        {/* Product Filter */}
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            Filter by Product
          </div>
          <div className="filter-buttons">
            <button className={`filter-btn ${productFilter === "all" ? "active" : ""}`} onClick={() => setProductFilter("all")}>
              All Products
            </button>
            <button className={`filter-btn ${productFilter === "none" ? "active" : ""}`} onClick={() => setProductFilter("none")}>
              No Product
            </button>
            {products.map((product: any) => (
              <button
                key={product.id}
                className={`filter-btn ${productFilter === product.id ? "active" : ""}`}
                onClick={() => setProductFilter(product.id)}
              >
                {product.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
        {filteredScripts.map((script, index) => (
          <div
            key={script.id}
            className="card animate-in"
            style={{
              animationDelay: `${index * 0.05}s`,
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                fontSize: '2rem',
                lineHeight: 1,
                background: 'linear-gradient(135deg, var(--cf-blue-light), var(--cf-blue))',
                borderRadius: '10px',
                padding: '0.65rem',
                boxShadow: '0 4px 12px rgba(0, 81, 195, 0.2)'
              }}>
                {script.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{script.name}</h3>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)'
                  }}>
                    {script.language}
                  </span>
                </div>
                <p style={{ margin: '0.5rem 0', color: 'var(--text-secondary)' }}>{script.description}</p>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
                  <span>👤 {script.author}</span>
                  <span>❤️ {script.likes} likes</span>
                  <span>📋 {script.uses} uses</span>
                  <span>🕐 {script.createdAt ? getRelativeTime(script.createdAt) : script.date}</span>
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '1rem',
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '0.875rem',
              overflow: 'auto',
              marginBottom: '1rem'
            }}>
              <pre style={{ margin: 0, color: 'var(--text-primary)' }}>{script.code}</pre>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleCopyCode(script.id, script.code)}
                className="btn-sm"
              >
                📋 Copy ({script.uses || 0} uses)
              </button>
              <button
                onClick={() => handleLike(script.id)}
                className={`btn-sm ${likedScripts.has(script.id) ? 'heart-btn liked' : 'btn-secondary'}`}
              >
                {likedScripts.has(script.id) ? '❤️' : '🤍'} {script.likes}
              </button>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteScript(script.id);
                  }}
                  type="button"
                  className="btn-danger btn-sm"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>💻 Share a Script</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();

              const scriptData = {
                id: Date.now().toString(),
                name: newScript.name,
                language: newScript.language,
                category: newScript.category,
                description: newScript.description,
                author: newScript.author,
                code: newScript.code,
                productId: newScript.productId,
                likes: 0,
                uses: 0,
                date: 'Just now',
                createdAt: new Date().toISOString(),
                icon: getCategoryIcon(newScript.category),
                targetGroups: newScript.targetGroups
              };

              try {
                await api.scripts.create(scriptData);
                setScripts(prev => [scriptData, ...prev]);
                setShowModal(false);
                setNewScript({
                  name: "",
                  language: "javascript",
                  category: "api",
                  description: "",
                  author: "",
                  code: "",
                  productId: "",
                  targetGroups: ['all']
                });
                alert('Script shared successfully!');
              } catch (error) {
                console.error('Error sharing script:', error);
                alert('Failed to share script');
              }
            }}>
              <div className="form-group">
                <label htmlFor="name">Script Name *</label>
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  value={newScript.name}
                  onChange={(e) => setNewScript({ ...newScript, name: e.target.value })}
                  placeholder="e.g., Cloudflare API Auth Helper"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="author">Your Name *</label>
                <input
                  id="author"
                  type="text"
                  className="form-input"
                  value={newScript.author}
                  onChange={(e) => setNewScript({ ...newScript, author: e.target.value })}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="language">Language</label>
                <select
                  id="language"
                  className="form-select"
                  value={newScript.language}
                  onChange={(e) => setNewScript({ ...newScript, language: e.target.value })}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="bash">Bash</option>
                  <option value="sql">SQL</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  className="form-select"
                  value={newScript.category}
                  onChange={(e) => setNewScript({ ...newScript, category: e.target.value })}
                >
                  <option value="api">API</option>
                  <option value="automation">Automation</option>
                  <option value="database">Database</option>
                  <option value="security">Security</option>
                  <option value="utility">Utility</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="product">Product (optional)</label>
                <select
                  id="product"
                  className="form-select"
                  value={newScript.productId}
                  onChange={(e) => setNewScript({ ...newScript, productId: e.target.value })}
                >
                  <option value="">-- No specific product --</option>
                  {products.map((product: any) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  className="form-input"
                  value={newScript.description}
                  onChange={(e) => setNewScript({ ...newScript, description: e.target.value })}
                  placeholder="Brief description of what this script does"
                  required
                  rows={3}
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <GroupSelector
                selectedGroups={newScript.targetGroups}
                onChange={(groups) => setNewScript({ ...newScript, targetGroups: groups })}
              />

              <div className="form-group">
                <label htmlFor="code">Code *</label>
                <textarea
                  id="code"
                  className="form-input"
                  value={newScript.code}
                  onChange={(e) => setNewScript({ ...newScript, code: e.target.value })}
                  placeholder="Paste your code here..."
                  required
                  rows={10}
                  style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: '13px', minHeight: '200px', resize: 'vertical' }}
                />
              </div>

              <div className="modal-actions">
                <button type="submit">Share Script</button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem', paddingBottom: '2rem' }}>
        Please report any bugs to Arun Potta
      </div>
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    api: '🔑',
    automation: '🚀',
    database: '🗄️',
    security: '🛡️',
    utility: '🔧'
  };
  return icons[category] || '💻';
}
