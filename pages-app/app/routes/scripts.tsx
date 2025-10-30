import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";

export function meta() {
  return [
    { title: "Scripts - SE Portal" },
    { name: "description", content: "Code snippets and automation scripts" },
  ];
}

export default function Scripts() {
  const { isAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

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

  useEffect(() => {
    const loadScripts = async () => {
      try {
        const data = await api.scripts.getAll();
        setScripts(data);
      } catch (e) {
        console.error('Error loading scripts:', e);
      }
    };
    loadScripts();
  }, []);

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

  const filteredScripts = scripts.filter((script) => {
    const matchesSearch = script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         script.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || script.category === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>💻 Code Scripts</h2>
          <p>Reusable code snippets and automation tools</p>
        </div>
        <button>+ Share Script</button>
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
                  <span>🕐 {script.date}</span>
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
              <button style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Copy Code</button>
              <button style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '2px solid var(--border-color)' }}>
                ❤️ Like
              </button>
              <button style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '2px solid var(--border-color)' }}>
                Share
              </button>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteScript(script.id);
                  }}
                  type="button"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    background: 'var(--error)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '980px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
