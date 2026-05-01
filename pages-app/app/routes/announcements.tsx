import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { useMcp } from "../contexts/McpContext";
import { McpAuthBanner } from "../components/McpAuthBanner";
import { api } from "../lib/api";
import { GroupSelector } from "../components/GroupSelector";
import { getRelativeTime } from "../lib/timeUtils";

export function meta() {
  return [
    { title: "Announcements - SolutionHub" },
    { name: "description", content: "Team announcements and important updates" },
  ];
}

export default function Announcements() {
  const { isAdmin } = useAdmin();
  const mcp = useMcp();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    message: "",
    priority: "normal",
    targetGroups: ['all'] as string[]
  });

  // Email generator state
  const [emailTarget, setEmailTarget] = useState<any>(null); // the announcement to generate email from
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [emailTone, setEmailTone] = useState('professional');
  const [customerName, setCustomerName] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<'subject' | 'body' | 'all' | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [annData, prodData] = await Promise.all([
          api.announcements.getAll(),
          api.products.getAll(),
        ]);
        setAnnouncements(Array.isArray(annData) ? annData : []);
        setProducts(Array.isArray(prodData) ? prodData : []);
      } catch (e) {
        console.error('Error loading data:', e);
        setAnnouncements([]);
      }
    };
    loadData();
  }, []);

  const openEmailGenerator = (announcement: any) => {
    setEmailTarget(announcement);
    setSelectedProducts([]);
    setCustomerName('');
    setEmailTone('professional');
    setGeneratedEmail(null);
  };

  const handleGenerate = async () => {
    if (!emailTarget) return;
    setGenerating(true);
    setGeneratedEmail(null);
    try {
      // Best-effort cf-portal MCP grounding — pull recent product context
      // from the wiki / Backstage when relevant. Falls back to no-grounding
      // if the user isn't authed.
      const mcpQuery = `${emailTarget.title}\n${emailTarget.message}\nProducts: ${selectedProducts.join(', ')}`;
      const mcpContext = await mcp.gather(mcpQuery, { catalog: false });
      const result = await api.announcements.generateEmail({
        title: emailTarget.title,
        message: emailTarget.message,
        products: selectedProducts,
        tone: emailTone,
        customerName,
        mcp_context: mcpContext.length > 0 ? mcpContext : undefined,
      });
      setGeneratedEmail(result);
    } catch (err) {
      console.error('Error generating email:', err);
      alert('Failed to generate email. Please try again.');
    }
    setGenerating(false);
  };

  const copyToClipboard = async (text: string, type: 'subject' | 'body' | 'all') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleProduct = (id: string) => {
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const deleteAnnouncement = async (announcementId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this announcement?');
    if (confirmed) {
      try {
        await api.announcements.delete(announcementId);
        setAnnouncements(prev => prev.filter(announcement => announcement.id !== announcementId));
      } catch (e) {
        console.error('Error deleting announcement:', e);
        alert('Failed to delete announcement');
      }
    }
  };

  const priorityConfig: Record<string, { color: string; label: string; badgeClass: string; iconPath: string }> = {
    urgent: {
      color: 'var(--color-danger)',
      label: 'Urgent',
      badgeClass: 'badge-red',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    },
    high: {
      color: 'var(--color-warning)',
      label: 'High Priority',
      badgeClass: 'badge-yellow',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    },
    normal: {
      color: 'var(--cf-blue)',
      label: 'Normal',
      badgeClass: 'badge-blue',
      iconPath: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z'
    },
    low: {
      color: 'var(--text-tertiary)',
      label: 'FYI',
      badgeClass: 'badge-gray',
      iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Announcements</h2>
          <p className="page-subtitle">Important updates and team communications</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
            New Announcement
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {announcements.map((announcement, index) => {
          const config = priorityConfig[announcement.priority as keyof typeof priorityConfig] || priorityConfig.normal;

          return (
            <div
              key={announcement.id}
              className="card animate-in"
              style={{
                animationDelay: `${index * 0.05}s`,
                borderLeft: `3px solid ${config.color}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `color-mix(in srgb, ${config.color} 10%, transparent)`,
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={config.iconPath} />
                      </svg>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontFamily: "'DM Serif Display', serif" }}>{announcement.title}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`badge ${config.badgeClass}`} style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '10px' }}>
                      {config.label}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      {announcement.createdAt ? getRelativeTime(announcement.createdAt) : announcement.date}
                    </span>
                    {announcement.author && (
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        by {announcement.author}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                  <button
                    onClick={() => openEmailGenerator(announcement)}
                    className="btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Generate Email
                  </button>
                  {isAdmin && (
                    <button onClick={() => deleteAnnouncement(announcement.id)} className="btn-danger btn-sm">
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <p style={{
                margin: '16px 0 0 0', fontSize: '14px', lineHeight: 1.7,
                color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxWidth: 'none',
              }}>
                {announcement.message}
              </p>

              {announcement.targetGroups && announcement.targetGroups.length > 0 &&
               !announcement.targetGroups.includes('all') && (
                <div style={{
                  marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)',
                  fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Targeted to: {announcement.targetGroups.join(', ')}
                </div>
              )}
            </div>
          );
        })}

        {announcements.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
              </svg>
            </div>
            <p className="empty-state-text">No announcements yet</p>
            <p className="empty-state-sub">
              {isAdmin ? 'Create your first announcement to share updates with the team' : 'Check back later for team updates'}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Announcement</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&#215;</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const currentUser = localStorage.getItem('seportal_user_name') || 'Admin';
              const announcementData = {
                id: Date.now().toString(),
                title: newAnnouncement.title,
                message: newAnnouncement.message,
                priority: newAnnouncement.priority,
                author: currentUser,
                date: new Date().toLocaleDateString(),
                targetGroups: newAnnouncement.targetGroups,
                createdAt: new Date().toISOString()
              };
              try {
                await api.announcements.create(announcementData);
                setAnnouncements(prev => [announcementData, ...prev]);
                setShowModal(false);
                setNewAnnouncement({ title: "", message: "", priority: "normal", targetGroups: ['all'] });
              } catch (error) {
                console.error('Error creating announcement:', error);
                alert('Failed to create announcement');
              }
            }}>
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input id="title" type="text" className="form-input" value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  placeholder="e.g., Q4 Goals Meeting Tomorrow" required />
              </div>
              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select id="priority" className="form-select" value={newAnnouncement.priority}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value })}>
                  <option value="low">FYI - Low Priority</option>
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea id="message" className="form-input" value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                  placeholder="Share important information with the team..." rows={6} required style={{ resize: 'vertical' }} />
              </div>
              <GroupSelector selectedGroups={newAnnouncement.targetGroups}
                onChange={(groups) => setNewAnnouncement({ ...newAnnouncement, targetGroups: groups })} />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit">Create Announcement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Generator Modal */}
      {emailTarget && (
        <div className="modal-overlay" onClick={() => setEmailTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Generate Customer Email</h3>
              <button className="modal-close" onClick={() => setEmailTarget(null)}>&#215;</button>
            </div>

            <div style={{ padding: '4px 0 16px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Based on:</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{emailTarget.title}</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5, maxHeight: '60px', overflow: 'hidden' }}>
                {emailTarget.message}
              </p>
            </div>

            {/* MCP grounding affordance */}
            <McpAuthBanner feature="The AI email writer" />


            {/* Product Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                Which products can mitigate this?
              </label>
              {products.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {products.map((product: any) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => toggleProduct(product.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: selectedProducts.includes(product.id) ? '1px solid var(--cf-orange)' : '1px solid var(--border-color)',
                        background: selectedProducts.includes(product.id) ? 'rgba(246,130,31,0.1)' : 'var(--bg-tertiary)',
                        color: selectedProducts.includes(product.id) ? 'var(--cf-orange)' : 'var(--text-secondary)',
                      }}
                    >
                      {selectedProducts.includes(product.id) ? '+ ' : ''}{product.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                  No products configured. AI will recommend relevant Cloudflare products automatically.
                </p>
              )}
            </div>

            {/* Tone & Customer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Tone</label>
                <select
                  className="form-input"
                  value={emailTone}
                  onChange={(e) => setEmailTone(e.target.value)}
                >
                  <option value="professional">Professional</option>
                  <option value="urgent">Urgent / Time-sensitive</option>
                  <option value="friendly">Friendly / Consultative</option>
                  <option value="technical">Technical / Detailed</option>
                  <option value="executive">Executive Summary</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Customer Name (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{ width: '100%', marginBottom: '16px' }}
            >
              {generating ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                  Generating with AI...
                </span>
              ) : (
                <>Generate Email</>
              )}
            </button>

            {/* Generated Email Preview */}
            {generatedEmail && (
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                {/* Subject */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Subject</span>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>{generatedEmail.subject}</div>
                  </div>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => copyToClipboard(generatedEmail.subject, 'subject')}
                    style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                  >
                    {copied === 'subject' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Body</span>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => copyToClipboard(generatedEmail.body, 'body')}
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                      {copied === 'body' ? 'Copied!' : 'Copy Body'}
                    </button>
                  </div>
                  <div style={{
                    fontSize: '13px', lineHeight: 1.7, color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                    background: 'var(--bg-primary)', padding: '14px', borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                  }}>
                    {generatedEmail.body}
                  </div>
                </div>

                {/* Copy All + Regenerate */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-secondary"
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{ fontSize: '13px', padding: '8px 16px' }}
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={() => copyToClipboard(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`, 'all')}
                    style={{ fontSize: '13px', padding: '8px 16px' }}
                  >
                    {copied === 'all' ? 'Copied!' : 'Copy Full Email'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="page-footer">SolutionHub by Cloudflare SE Team</div>
    </div>
  );
}
