import { useState, useEffect, useMemo, useRef } from "react";
import { api } from "../lib/api";
import { useAdmin } from "../contexts/AdminContext";

export function meta() {
  return [
    { title: "AI Hub - SolutionHub" },
    { name: "description", content: "AI-powered messaging coach and solution library for Cloudflare Solutions Engineers" },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// Sales stages and solution types — these mirror the cards in the design spec
// ──────────────────────────────────────────────────────────────────────────────

type Stage = 'all' | 'running-business' | 'account-planning' | 'qualification' | 'solution-design' | 'negotiation' | 'renewals';
type SolType = 'all' | 'tool' | 'gem' | 'prompt' | 'skill' | 'workflow' | 'agent';
type Sort = 'upvotes' | 'recent' | 'uses' | 'alpha';

// ──────────────────────────────────────────────────────────────────────────────
// SE Messaging Playbooks — kinds and metadata
//
// Playbook artifacts are stored in the same `ai_solutions` table, marked with a
// `playbook` tag plus a kind tag (e.g. `playbook:discovery`). The new inline
// section on /ai-hub groups them by kind for the active stage and uses the
// same Cloudflare-skills-grounded chat coach for "Ask AI" deep-dives.
// ──────────────────────────────────────────────────────────────────────────────
type PlaybookKind = 'value-prop' | 'discovery' | 'objection' | 'email' | 'talk-track' | 'close';

const PLAYBOOK_KINDS: Array<{ id: PlaybookKind; label: string; subtitle: string; icon: string; accent: string; tag: string }> = [
  { id: 'value-prop',  label: 'Value Statements',   subtitle: 'Why Cloudflare, told three ways',                   icon: '💎', accent: '#8B5CF6', tag: 'playbook:value-prop' },
  { id: 'discovery',   label: 'Discovery Questions', subtitle: 'MEDDPICC, pain framing & qualification scripts',   icon: '🔍', accent: '#0051C3', tag: 'playbook:discovery'  },
  { id: 'objection',   label: 'Objection Handlers',  subtitle: 'Defuse, reframe, and earn the next step',           icon: '🛡️', accent: '#EC4899', tag: 'playbook:objection'  },
  { id: 'email',       label: 'Email Templates',     subtitle: 'Cold opens, follow-ups, procurement & escalation',  icon: '✉️', accent: '#10B981', tag: 'playbook:email'      },
  { id: 'talk-track',  label: 'Talk Tracks',         subtitle: 'Scripted moments for demos, briefs & QBRs',         icon: '🎬', accent: '#F6821F', tag: 'playbook:talk-track' },
  { id: 'close',       label: 'Closing Plays',       subtitle: 'Trial closes, ROI defenses & paper-process pushes', icon: '🎯', accent: '#14B8A6', tag: 'playbook:close'      },
];

const STAGES: Array<{ id: Stage; label: string; subtitle: string; accent: string }> = [
  { id: 'running-business', label: 'Running Your Business', subtitle: 'Prepare, run and follow up on customer meetings', accent: '#6366F1' },
  { id: 'all',              label: 'All Stages',            subtitle: 'Show everything', accent: '#F6821F' },
  { id: 'account-planning', label: 'Account Planning & Prospecting', subtitle: 'Prioritize accounts and develop engagement plans', accent: '#0051C3' },
  { id: 'qualification',    label: 'Qualification & Discovery', subtitle: 'Uncover the pain and identify solutions', accent: '#10B981' },
  { id: 'solution-design',  label: 'Solution Design & Proposal', subtitle: 'Advance deals with value selling', accent: '#8B5CF6' },
  { id: 'negotiation',      label: 'Negotiation & Close', subtitle: 'Navigate approvals & finalize deals', accent: '#EC4899' },
  { id: 'renewals',         label: 'Renewals & Retention', subtitle: 'Drive adoption & expansion', accent: '#14B8A6' },
];

const TYPE_FILTERS: Array<{ id: SolType; label: string; icon: string; comingSoon?: boolean }> = [
  { id: 'all',      label: 'All',      icon: '' },
  { id: 'tool',     label: 'Tool',     icon: 'M14.7 6.3a1 1 0 010 1.4l-1 1-2-2 1-1a1 1 0 011.4 0l.6.6zM4 16v4h4l9-9-4-4-9 9z' },
  { id: 'gem',      label: 'Gem',      icon: 'M12 2L2 9l10 13 10-13L12 2zm0 3.5L17.5 9 12 19 6.5 9 12 5.5z' },
  { id: 'prompt',   label: 'Prompt',   icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
  { id: 'skill',    label: 'Skill',    icon: 'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V6a2 2 0 012-2h14v13' },
  { id: 'workflow', label: 'Workflow', icon: 'M16 18l6-6-6-6M8 6l-6 6 6 6' },
  { id: 'agent',    label: 'Agents',   icon: 'M9 17l3-3 3 3M12 14V4', comingSoon: true },
];

const SUGGESTED_SEARCHES = ['account planning', 'competitive', 'forecast', 'discovery questions', 'objection handling'];

// Display badge color for solution types (used in cards)
const TYPE_BADGE: Record<SolType, string> = {
  all: 'badge-gray',
  tool: 'badge-orange',
  gem: 'badge-purple',
  prompt: 'badge-blue',
  skill: 'badge-teal',
  workflow: 'badge-indigo',
  agent: 'badge-pink',
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString();
}

function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.resolve();
}

// Parse a solution's tags (which can be a JSON string, a real array, or null)
// into a plain string array.
function parseTags(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

// Identify which playbook kind a solution belongs to (or null if it is not a
// playbook artifact at all). Looks for tags like "playbook:discovery".
function getPlaybookKind(solution: any): PlaybookKind | null {
  const tags = parseTags(solution.tags);
  if (!tags.includes('playbook')) return null;
  const kindTag = tags.find((t: string) => t.startsWith('playbook:'));
  if (!kindTag) return null;
  const kind = kindTag.replace('playbook:', '') as PlaybookKind;
  return PLAYBOOK_KINDS.find(k => k.id === kind) ? kind : null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page component
// ──────────────────────────────────────────────────────────────────────────────

export default function AIHub() {
  const { isAdmin, currentUserName } = useAdmin();

  // Filters & UI state
  const [stage, setStage] = useState<Stage>('all');
  const [solType, setSolType] = useState<SolType>('all');
  const [sort, setSort] = useState<Sort>('upvotes');
  const [searchInput, setSearchInput] = useState('');
  const [searchActive, setSearchActive] = useState('');
  const [expandStarter, setExpandStarter] = useState(true);
  const [expandCommunity, setExpandCommunity] = useState(true);

  // Data
  const [solutions, setSolutions] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, starters: 0, community: 0, skills: { count: 0, indexed: 0, chunks: 0 } });
  const [myUpvotes, setMyUpvotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Playbook artifacts are loaded with their own request because the global
  // Solution Type filter (e.g. type=tool) would otherwise hide them. Loaded
  // independently when the active stage changes.
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [playbooksLoading, setPlaybooksLoading] = useState(true);

  // Modals
  const [chatOpen, setChatOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [viewSolution, setViewSolution] = useState<any | null>(null);
  // Solutions the user has explicitly attached as chat context (chips inside the chat modal)
  const [chatContextSolution, setChatContextSolution] = useState<any | null>(null);

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('seportal_user') : null;

  const loadData = async () => {
    setLoading(true);
    try {
      const [sols, sk, st] = await Promise.all([
        api.aiHub.listSolutions({
          stage: stage === 'all' ? undefined : stage,
          type: solType === 'all' ? undefined : solType,
          sort,
          q: searchActive || undefined,
        }),
        api.aiHub.listSkills().catch(() => []),
        api.aiHub.stats().catch(() => ({ total: 0, starters: 0, community: 0, skills: { count: 0, indexed: 0, chunks: 0 } })),
      ]);
      setSolutions(Array.isArray(sols) ? sols : []);
      setSkills(Array.isArray(sk) ? sk : []);
      setStats(st);
      if (userEmail) {
        try {
          const uv = await api.aiHub.getMyUpvotes(userEmail);
          setMyUpvotes(new Set(uv));
        } catch { /* noop */ }
      }
    } catch (e) {
      console.error('AI Hub load failed:', e);
    }
    setLoading(false);
  };

  // Playbooks load on stage change (independent of solType / sort / search)
  // so the SE Messaging Playbook section keeps showing artifacts even when
  // the user filters the main library by a different solution type.
  const loadPlaybooks = async () => {
    setPlaybooksLoading(true);
    try {
      const rows = await api.aiHub.listSolutions({
        stage: stage === 'all' ? undefined : stage,
        tag: 'playbook',
        sort: 'upvotes',
      });
      setPlaybooks(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error('AI Hub playbooks load failed:', e);
      setPlaybooks([]);
    }
    setPlaybooksLoading(false);
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [stage, solType, sort, searchActive]);
  useEffect(() => { loadPlaybooks(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [stage]);

  // Playbook artifacts surface in the dedicated Messaging Playbook section
  // above, so we drop them from the Starter Pack / Community lists to avoid
  // showing the same card twice.
  const isPlaybook = (s: any) => parseTags(s.tags).includes('playbook');
  const starterPack = useMemo(
    () => solutions.filter(s => (s.is_starter === 1 || s.is_starter === true) && !isPlaybook(s)),
    [solutions],
  );
  const community  = useMemo(
    () => solutions.filter(s => !(s.is_starter === 1 || s.is_starter === true) && !isPlaybook(s)),
    [solutions],
  );

  const handleUpvote = async (id: string) => {
    if (!userEmail) {
      alert('Please sign in to upvote');
      return;
    }
    try {
      const result = await api.aiHub.toggleUpvote(id, userEmail);
      setMyUpvotes(prev => {
        const next = new Set(prev);
        if (result.upvoted) next.add(id); else next.delete(id);
        return next;
      });
      setSolutions(prev => prev.map(s => s.id === id ? { ...s, upvotes: result.upvotes } : s));
    } catch (e) {
      console.error('Upvote failed', e);
    }
  };

  const handleSearchSubmit = () => setSearchActive(searchInput.trim());

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* ─────────── Hero ─────────── */}
      <div
        className="animate-in"
        style={{
          padding: '36px 36px 32px',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, #FFF8F0 0%, #FFFCFB 50%, #FFF8F0 100%)',
          border: '1px solid var(--border-color)',
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-40px',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(246,130,31,0.18) 0%, transparent 70%)',
          animation: 'gradientOrb 8s ease-in-out infinite', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', left: '-60px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
          animation: 'gradientOrb 10s ease-in-out infinite reverse', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 480px', minWidth: 0 }}>
            <h1 style={{
              fontSize: '40px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.04em',
              lineHeight: 1.05, color: 'var(--text-primary)',
            }}>
              The Hub for<br />
              <span style={{ color: 'var(--cf-orange)' }}>AI Sales Solutions</span>
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Tools, prompts, gems, skills &amp; agents — by sellers, for sellers
            </p>
          </div>

          {/* Right rail action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setChatOpen(true)}
              style={{ justifyContent: 'flex-start', gap: '8px', padding: '10px 14px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              Ask the AI Coach
              <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 6px', background: 'var(--cf-orange)', color: 'white', borderRadius: '10px', fontWeight: 700 }}>NEW</span>
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setSubmitOpen(true)}
              style={{ justifyContent: 'flex-start', gap: '8px', padding: '10px 14px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Contribute a Solution
            </button>
            {isAdmin && (
              <button
                className="btn-secondary btn-sm"
                onClick={() => setAdminOpen(true)}
                style={{ justifyContent: 'flex-start', gap: '8px', padding: '10px 14px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Admin: Knowledge Base
              </button>
            )}
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
              <span>{stats.skills?.indexed || 0}/{stats.skills?.count || 0} CF skills indexed</span>
              <span>·</span>
              <span>{stats.skills?.chunks || 0} chunks</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────── Search bar ─────────── */}
      <div
        className="animate-in"
        style={{
          animationDelay: '0.05s',
          padding: '14px 18px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          marginBottom: '16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 460px', minWidth: '260px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
            placeholder="Search tools, prompts, gems, skills, workflows..."
            style={{
              width: '100%',
              padding: '12px 14px 12px 42px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
        <button
          onClick={handleSearchSubmit}
          style={{
            padding: '10px 22px',
            background: 'linear-gradient(135deg, var(--cf-orange) 0%, var(--cf-orange-dark) 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Search
        </button>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Try:</span>
          {SUGGESTED_SEARCHES.slice(0, 3).map(t => (
            <button
              key={t}
              onClick={() => { setSearchInput(t); setSearchActive(t); }}
              style={{
                padding: '4px 11px', borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)',
                fontSize: '12px', color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>
        {searchActive && (
          <button
            onClick={() => { setSearchInput(''); setSearchActive(''); }}
            style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--cf-orange)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Clear search
          </button>
        )}
      </div>

      {/* ─────────── Stage filter cards ─────────── */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '0 4px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Sales Stage</span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '8px',
        }}>
          {STAGES.map(s => {
            const active = stage === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStage(s.id)}
                style={{
                  padding: '14px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: active ? `1.5px solid ${s.accent}` : '1px solid var(--border-color)',
                  background: active ? `linear-gradient(135deg, ${s.accent}11 0%, ${s.accent}06 100%)` : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: active ? `0 0 0 3px ${s.accent}1f` : 'none',
                  minHeight: '92px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border-color-strong)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25 }}>{s.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{s.subtitle}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────── SE Messaging Playbooks (new section) ─────────── */}
      <MessagingPlaybookSection
        stage={stage}
        playbooks={playbooks}
        loading={playbooksLoading}
        skillsIndexed={stats.skills?.indexed || 0}
        onPickStage={setStage}
        onAskAI={(s) => { setChatContextSolution(s); setChatOpen(true); }}
        onView={(s) => { setViewSolution(s); api.aiHub.trackUse(s.id, 'view', userEmail || undefined, currentUserName || undefined); }}
        onCopy={(s) => api.aiHub.trackUse(s.id, 'copy', userEmail || undefined, currentUserName || undefined)}
        onOpenChat={() => setChatOpen(true)}
      />

      {/* ─────────── Type filter + sort ─────────── */}
      <div
        className="animate-in"
        style={{
          animationDelay: '0.1s',
          padding: '14px 18px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
          Solution Type:
        </span>
        {TYPE_FILTERS.map(t => {
          const active = solType === t.id;
          return (
            <button
              key={t.id}
              disabled={t.comingSoon}
              onClick={() => !t.comingSoon && setSolType(t.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: active ? '1.5px solid var(--cf-orange)' : '1px solid var(--border-color)',
                background: active ? 'rgba(246,130,31,0.1)' : 'var(--bg-tertiary)',
                color: t.comingSoon ? 'var(--text-tertiary)' : (active ? 'var(--cf-orange)' : 'var(--text-primary)'),
                fontSize: '13px',
                fontWeight: active ? 700 : 500,
                cursor: t.comingSoon ? 'not-allowed' : 'pointer',
                opacity: t.comingSoon ? 0.55 : 1,
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}
            >
              {t.icon && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
              )}
              {t.label}
              {t.comingSoon && (
                <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(246,130,31,0.12)', color: 'var(--cf-orange)', borderRadius: '6px', fontWeight: 700, letterSpacing: '0.04em' }}>
                  COMING SOON
                </span>
              )}
            </button>
          );
        })}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
            Sort by:
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
              fontSize: '13px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="upvotes">Most Upvoted</option>
            <option value="recent">Recently Added</option>
            <option value="uses">Most Used</option>
            <option value="alpha">A → Z</option>
          </select>
        </div>
      </div>

      {/* ─────────── Results ─────────── */}
      <div className="animate-in" style={{ animationDelay: '0.15s' }}>
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', padding: '0 4px',
        }}>
          {loading ? 'Loading…' : `Showing ${solutions.length} solutions`}
        </div>

        {/* Starter pack accordion */}
        <AccordionSection
          icon="star"
          accent="#F6821F"
          background="linear-gradient(135deg, rgba(246,130,31,0.07) 0%, rgba(246,130,31,0.02) 100%)"
          title="Starter pack"
          subtitle="Frequently used solutions for seller workflows"
          count={starterPack.length}
          open={expandStarter}
          onToggle={() => setExpandStarter(v => !v)}
        >
          {starterPack.length === 0 ? (
            <EmptyState text={loading ? 'Loading starter pack…' : 'No starter pack solutions yet. An admin can pin curated entries here.'} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
              {starterPack.map(s => (
                <SolutionCard
                  key={s.id}
                  solution={s}
                  upvoted={myUpvotes.has(s.id)}
                  onView={() => { setViewSolution(s); api.aiHub.trackUse(s.id, 'view', userEmail || undefined, currentUserName || undefined); }}
                  onUpvote={() => handleUpvote(s.id)}
                  onAskAI={() => { setChatContextSolution(s); setChatOpen(true); }}
                />
              ))}
            </div>
          )}
        </AccordionSection>

        {/* Community contributions accordion */}
        <AccordionSection
          icon="users"
          accent="#6366F1"
          background="var(--bg-secondary)"
          title="Community contributions"
          subtitle="Shared tools and prompts built by Cloudflare sellers"
          count={community.length}
          open={expandCommunity}
          onToggle={() => setExpandCommunity(v => !v)}
        >
          {community.length === 0 ? (
            <EmptyState text={loading ? 'Loading community contributions…' : 'No community contributions yet. Be the first — click "Contribute a Solution" up top.'} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
              {community.map(s => (
                <SolutionCard
                  key={s.id}
                  solution={s}
                  upvoted={myUpvotes.has(s.id)}
                  onView={() => { setViewSolution(s); api.aiHub.trackUse(s.id, 'view', userEmail || undefined, currentUserName || undefined); }}
                  onUpvote={() => handleUpvote(s.id)}
                  onAskAI={() => { setChatContextSolution(s); setChatOpen(true); }}
                />
              ))}
            </div>
          )}
        </AccordionSection>
      </div>

      <div className="page-footer" style={{ marginTop: '32px' }}>
        AI Hub · Powered by Cloudflare Workers AI &amp; the official cloudflare/skills repo on GitHub
      </div>

      {/* ─────────── Chat / Submit / Admin / Detail modals ─────────── */}
      {chatOpen && (
        <ChatModal
          onClose={() => { setChatOpen(false); setChatContextSolution(null); }}
          initialStage={stage}
          contextSolution={chatContextSolution}
          userEmail={userEmail || ''}
          userName={currentUserName || ''}
        />
      )}
      {submitOpen && (
        <SubmitSolutionModal
          onClose={() => setSubmitOpen(false)}
          userEmail={userEmail || ''}
          userName={currentUserName || ''}
          isAdmin={isAdmin}
          onCreated={() => { setSubmitOpen(false); loadData(); }}
        />
      )}
      {adminOpen && isAdmin && (
        <AdminKnowledgeModal onClose={() => { setAdminOpen(false); loadData(); }} skills={skills} />
      )}
      {viewSolution && (
        <SolutionDetailModal
          solution={viewSolution}
          upvoted={myUpvotes.has(viewSolution.id)}
          onClose={() => setViewSolution(null)}
          onUpvote={() => handleUpvote(viewSolution.id)}
          onAskAI={() => { setChatContextSolution(viewSolution); setViewSolution(null); setChatOpen(true); }}
          onCopy={() => api.aiHub.trackUse(viewSolution.id, 'copy', userEmail || undefined, currentUserName || undefined)}
          isAdmin={isAdmin}
          userEmail={userEmail || ''}
          onDeleted={() => { setViewSolution(null); loadData(); }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SE Messaging Playbook section
//
// New inline section that shows curated stage-by-stage messaging artifacts
// (value statements, discovery questions, objection handlers, email templates,
// talk tracks, closing plays) loaded from D1. Every artifact has a one-click
// "Ask AI Coach" button that opens the existing chat modal pre-populated with
// the artifact as context — the coach is grounded in the cloudflare/skills
// repo via Vectorize plus general AI knowledge.
// ──────────────────────────────────────────────────────────────────────────────
function MessagingPlaybookSection({
  stage, playbooks, loading, skillsIndexed,
  onPickStage, onAskAI, onView, onCopy, onOpenChat,
}: {
  stage: Stage;
  playbooks: any[];
  loading: boolean;
  skillsIndexed: number;
  onPickStage: (s: Stage) => void;
  onAskAI: (sol: any) => void;
  onView: (sol: any) => void;
  onCopy: (sol: any) => void;
  onOpenChat: () => void;
}) {
  const [activeKind, setActiveKind] = useState<PlaybookKind | 'all'>('all');

  // When the stage changes, reset the kind filter.
  useEffect(() => { setActiveKind('all'); }, [stage]);

  // Group artifacts by kind for the active stage view.
  const grouped = useMemo(() => {
    const byKind: Record<PlaybookKind, any[]> = {
      'value-prop': [], discovery: [], objection: [], email: [], 'talk-track': [], close: [],
    };
    for (const p of playbooks) {
      const k = getPlaybookKind(p);
      if (k) byKind[k].push(p);
    }
    return byKind;
  }, [playbooks]);

  // Group artifacts by stage for the all-stages view.
  const byStage = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const p of playbooks) {
      const sg = p.sales_stage || 'all';
      if (!map.has(sg)) map.set(sg, []);
      map.get(sg)!.push(p);
    }
    return map;
  }, [playbooks]);

  const totalCount = playbooks.length;
  const stageInfo = STAGES.find(s => s.id === stage)!;
  const showingAll = stage === 'all';

  // Available kinds (only ones with content for the current stage)
  const availableKinds = PLAYBOOK_KINDS.filter(k => grouped[k.id].length > 0);
  const filteredKinds = activeKind === 'all' ? availableKinds : availableKinds.filter(k => k.id === activeKind);

  return (
    <div
      className="animate-in"
      style={{
        animationDelay: '0.08s',
        marginBottom: '20px',
        padding: '22px 24px 24px',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(246,130,31,0.04) 100%)',
        border: '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* decorative shimmer */}
      <div style={{
        position: 'absolute', top: '-100px', right: '-60px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
        animation: 'gradientOrb 9s ease-in-out infinite', pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--cf-orange) 0%, #6366F1 100%)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
          </svg>
        </div>

        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
              background: 'var(--cf-orange)', color: 'white', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>New</span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              SE Messaging Playbook
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.15 }}>
            {showingAll
              ? <>AI-coached messaging for every <span style={{ color: 'var(--cf-orange)' }}>sales stage</span></>
              : <>Messaging for <span style={{ color: stageInfo.accent }}>{stageInfo.label}</span></>}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Curated talk tracks, discovery questions, objection handlers and email templates &mdash; each one
            backed by an "Ask AI Coach" button grounded in the official <strong>cloudflare/skills</strong> repo.
            {skillsIndexed > 0 && (
              <span style={{ color: 'var(--text-tertiary)' }}> · {skillsIndexed} skills indexed.</span>
            )}
          </p>
        </div>

        <button
          onClick={onOpenChat}
          style={{
            padding: '9px 14px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'linear-gradient(135deg, var(--cf-orange) 0%, var(--cf-orange-dark) 100%)',
            color: 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          Open AI Coach
        </button>
      </div>

      {/* Kind filter pills (only when a specific stage is active) */}
      {!showingAll && availableKinds.length > 1 && (
        <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          <button
            onClick={() => setActiveKind('all')}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              border: activeKind === 'all' ? '1.5px solid var(--cf-orange)' : '1px solid var(--border-color)',
              background: activeKind === 'all' ? 'rgba(246,130,31,0.1)' : 'var(--bg-tertiary)',
              color: activeKind === 'all' ? 'var(--cf-orange)' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: activeKind === 'all' ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            All ({totalCount})
          </button>
          {availableKinds.map(k => (
            <button
              key={k.id}
              onClick={() => setActiveKind(k.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                border: activeKind === k.id ? `1.5px solid ${k.accent}` : '1px solid var(--border-color)',
                background: activeKind === k.id ? `${k.accent}1a` : 'var(--bg-tertiary)',
                color: activeKind === k.id ? k.accent : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: activeKind === k.id ? 700 : 500,
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '5px',
              }}
            >
              <span>{k.icon}</span>
              {k.label} <span style={{ opacity: 0.6 }}>({grouped[k.id].length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div style={{ position: 'relative', padding: '36px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Loading playbook artifacts…
        </div>
      ) : totalCount === 0 ? (
        <PlaybookEmpty stage={stage} onPickStage={onPickStage} onOpenChat={onOpenChat} />
      ) : showingAll ? (
        // All-stages view: stage-grouped quick browse
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {STAGES.filter(s => s.id !== 'all' && (byStage.get(s.id) || []).length > 0).map(s => {
            const items = byStage.get(s.id) || [];
            return (
              <button
                key={s.id}
                onClick={() => onPickStage(s.id)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: `linear-gradient(135deg, ${s.accent}10 0%, var(--bg-secondary) 100%)`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = s.accent;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{s.label}</span>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    background: `${s.accent}20`, color: s.accent, fontWeight: 700,
                  }}>{items.length}</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                  {items.slice(0, 3).map((p: any) => p.icon || '•').join(' ')} {items[0]?.title}
                  {items.length > 1 && ` +${items.length - 1} more`}
                </span>
                <span style={{
                  fontSize: '11px', color: s.accent, fontWeight: 600, marginTop: '2px',
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}>
                  Open this stage →
                </span>
              </button>
            );
          })}
        </div>
      ) : filteredKinds.length === 0 ? (
        <PlaybookEmpty stage={stage} onPickStage={onPickStage} onOpenChat={onOpenChat} />
      ) : (
        // Stage-specific view: kind-grouped artifact cards
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {filteredKinds.map(k => (
            <div key={k.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                  background: `${k.accent}1a`, color: k.accent,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
                }}>{k.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{k.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{k.subtitle}</div>
                </div>
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  background: `${k.accent}1a`, color: k.accent, fontWeight: 700,
                }}>{grouped[k.id].length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
                {grouped[k.id].map(p => (
                  <PlaybookCard
                    key={p.id}
                    solution={p}
                    accent={k.accent}
                    onView={() => onView(p)}
                    onAskAI={() => onAskAI(p)}
                    onCopy={() => onCopy(p)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlaybookEmpty({
  stage, onPickStage, onOpenChat,
}: { stage: Stage; onPickStage: (s: Stage) => void; onOpenChat: () => void }) {
  const stageInfo = STAGES.find(s => s.id === stage)!;
  return (
    <div style={{
      position: 'relative',
      padding: '24px 20px',
      textAlign: 'center',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-secondary)',
      border: '1px dashed var(--border-color)',
    }}>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        No playbook artifacts yet for <strong>{stageInfo.label}</strong>.
      </div>
      <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => onPickStage('all')}
          className="btn-secondary btn-sm"
        >Browse all stages</button>
        <button onClick={onOpenChat} className="btn-secondary btn-sm">
          Ask AI Coach for {stageInfo.label.toLowerCase()} →
        </button>
      </div>
    </div>
  );
}

function PlaybookCard({
  solution, accent, onView, onAskAI, onCopy,
}: {
  solution: any;
  accent: string;
  onView: () => void;
  onAskAI: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(solution.content);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={onView}
      style={{
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderLeft: `3px solid ${accent}`,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: '128px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.borderLeftColor = accent;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-color)';
        e.currentTarget.style.borderLeftColor = accent;
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
        {solution.icon && <span style={{ marginRight: '6px' }}>{solution.icon}</span>}
        {solution.title}
      </div>
      {solution.description && (
        <div style={{
          fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {solution.description}
        </div>
      )}
      <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onAskAI(); }}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            color: 'white',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          Ask AI Coach
        </button>
        <button
          onClick={handleCopy}
          style={{
            padding: '5px 10px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)',
            background: copied ? 'rgba(16,185,129,0.12)' : 'var(--bg-tertiary)',
            color: copied ? 'var(--color-success)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-tertiary)' }}>
          {solution.upvotes ? `▲ ${solution.upvotes}` : ''}{solution.uses ? `${solution.upvotes ? ' · ' : ''}${solution.uses} uses` : ''}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Card components
// ──────────────────────────────────────────────────────────────────────────────

function AccordionSection({
  icon, accent, background, title, subtitle, count, open, onToggle, children,
}: {
  icon: 'star' | 'users';
  accent: string;
  background: string;
  title: string;
  subtitle: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '12px', borderRadius: 'var(--radius-lg)', background, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '16px 20px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: '38px', height: '38px', borderRadius: 'var(--radius-sm)',
          background: `${accent}1a`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon === 'star' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{subtitle}</div>
        </div>
        <span style={{
          padding: '4px 12px', borderRadius: 'var(--radius-full)',
          background: `${accent}1a`, color: accent,
          fontSize: '13px', fontWeight: 700, flexShrink: 0,
        }}>
          {count}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
             style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function SolutionCard({
  solution, upvoted, onView, onUpvote, onAskAI,
}: {
  solution: any;
  upvoted: boolean;
  onView: () => void;
  onUpvote: () => void;
  onAskAI: () => void;
}) {
  const type = (solution.type || 'prompt') as SolType;
  const stage = (STAGES.find(s => s.id === solution.sales_stage) || STAGES.find(s => s.id === 'all'))!;
  const tags: string[] = (() => {
    if (!solution.tags) return [];
    if (Array.isArray(solution.tags)) return solution.tags;
    try { return JSON.parse(solution.tags); } catch { return []; }
  })();

  return (
    <div
      onClick={onView}
      style={{
        padding: '16px 18px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-color-strong)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-color)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Top row: type badge + upvote button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
          <span className={`badge ${TYPE_BADGE[type]}`} style={{ textTransform: 'uppercase' }}>{type}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>·</span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>{stage.label.split('&')[0].trim()}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onUpvote(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            border: upvoted ? '1px solid var(--cf-orange)' : '1px solid var(--border-color)',
            background: upvoted ? 'rgba(246,130,31,0.12)' : 'var(--bg-tertiary)',
            color: upvoted ? 'var(--cf-orange)' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill={upvoted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          {solution.upvotes || 0}
        </button>
      </div>

      {/* Title */}
      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
        {solution.icon && <span style={{ marginRight: '6px' }}>{solution.icon}</span>}
        {solution.title}
      </div>

      {/* Description */}
      {solution.description && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {solution.description}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {tags.slice(0, 3).map((t: string) => (
            <span key={t} style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: 'var(--radius-full)',
              background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', fontWeight: 500,
            }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--cf-orange), var(--cf-orange-dark))',
            color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '9px', fontWeight: 700,
          }}>
            {(solution.author_name || '?').charAt(0).toUpperCase()}
          </span>
          {solution.author_name || 'Anonymous'} · {relativeTime(solution.created_at)}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onAskAI(); }}
          style={{
            padding: '4px 10px', borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)', background: 'transparent',
            color: 'var(--cf-orange)', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer', display: 'inline-flex', gap: '4px', alignItems: 'center',
          }}
        >
          Ask AI →
        </button>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      color: 'var(--text-tertiary)',
      fontSize: '13px',
      background: 'var(--bg-tertiary)',
      borderRadius: 'var(--radius-md)',
      border: '1px dashed var(--border-color)',
    }}>
      {text}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Solution detail modal
// ──────────────────────────────────────────────────────────────────────────────

function SolutionDetailModal({
  solution, upvoted, onClose, onUpvote, onAskAI, onCopy, isAdmin, userEmail, onDeleted,
}: {
  solution: any;
  upvoted: boolean;
  onClose: () => void;
  onUpvote: () => void;
  onAskAI: () => void;
  onCopy: () => void;
  isAdmin: boolean;
  userEmail: string;
  onDeleted: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const tags: string[] = (() => {
    if (!solution.tags) return [];
    if (Array.isArray(solution.tags)) return solution.tags;
    try { return JSON.parse(solution.tags); } catch { return []; }
  })();
  const stage = STAGES.find(s => s.id === solution.sales_stage) || STAGES.find(s => s.id === 'all')!;

  const handleCopy = () => {
    copyToClipboard(solution.content);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this solution permanently?')) return;
    try {
      await api.aiHub.deleteSolution(solution.id);
      onDeleted();
    } catch (e: any) {
      alert(`Delete failed: ${e.message || 'unknown error'}`);
    }
  };

  const canDelete = isAdmin || (userEmail && solution.author_email === userEmail);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {solution.icon && <span style={{ fontSize: '24px' }}>{solution.icon}</span>}
            {solution.title}
          </h3>
          <button className="modal-close" onClick={onClose}>&#215;</button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          <span className={`badge ${TYPE_BADGE[solution.type as SolType] || 'badge-gray'}`} style={{ textTransform: 'uppercase' }}>
            {solution.type}
          </span>
          <span className="badge badge-gray">{stage.label}</span>
          {solution.product && <span className="badge badge-blue">{solution.product}</span>}
          {solution.is_starter === 1 && <span className="badge badge-orange">Starter</span>}
          {tags.map(t => <span key={t} className="badge badge-gray">{t}</span>)}
        </div>

        {solution.description && (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '16px' }}>
            {solution.description}
          </p>
        )}

        <div style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          fontSize: '13px',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          whiteSpace: 'pre-wrap',
          color: 'var(--text-primary)',
          maxHeight: '320px',
          overflowY: 'auto',
          marginBottom: '16px',
          lineHeight: 1.55,
        }}>
          {solution.content}
        </div>

        {solution.source_url && (
          <a
            href={solution.source_url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '12px', color: 'var(--cf-orange)', textDecoration: 'none', display: 'inline-flex', gap: '4px', alignItems: 'center', marginBottom: '14px' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
            View source
          </a>
        )}

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '14px' }}>
          <span style={{
            width: '24px', height: '24px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--cf-orange), var(--cf-orange-dark))',
            color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700,
          }}>
            {(solution.author_name || '?').charAt(0).toUpperCase()}
          </span>
          By <strong style={{ color: 'var(--text-secondary)' }}>{solution.author_name}</strong> · added {relativeTime(solution.created_at)} · {solution.uses || 0} uses · {solution.upvotes || 0} upvotes
        </div>

        <div className="modal-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
          {canDelete && (
            <button onClick={handleDelete} className="btn-secondary" style={{ marginRight: 'auto', color: 'var(--color-danger)' }}>
              Delete
            </button>
          )}
          <button
            onClick={onUpvote}
            className="btn-secondary"
            style={{
              borderColor: upvoted ? 'var(--cf-orange)' : undefined,
              color: upvoted ? 'var(--cf-orange)' : undefined,
              background: upvoted ? 'rgba(246,130,31,0.1)' : undefined,
            }}
          >
            ▲ {upvoted ? 'Upvoted' : 'Upvote'} ({solution.upvotes || 0})
          </button>
          <button onClick={handleCopy} className="btn-secondary">
            {copied ? '✓ Copied' : 'Copy content'}
          </button>
          <button onClick={onAskAI}>
            Ask AI Coach with this →
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Submit-a-solution modal
// ──────────────────────────────────────────────────────────────────────────────

function SubmitSolutionModal({
  onClose, userEmail, userName, isAdmin, onCreated,
}: {
  onClose: () => void;
  userEmail: string;
  userName: string;
  isAdmin: boolean;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    type: 'prompt' as SolType,
    title: '',
    description: '',
    content: '',
    sales_stage: 'all' as Stage,
    product: '',
    tags: '',
    icon: '',
    source_url: '',
    is_starter: false,
    is_pinned: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!userEmail) { setError('You need to be signed in to contribute a solution.'); return; }
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.content.trim()) { setError('Content is required (the actual prompt, workflow steps, etc.)'); return; }
    setSaving(true);
    setError(null);
    try {
      await api.aiHub.createSolution({
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        content: form.content,
        sales_stage: form.sales_stage,
        product: form.product.trim() || undefined,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        icon: form.icon.trim() || undefined,
        source_url: form.source_url.trim() || undefined,
        author_email: userEmail,
        author_name: userName || userEmail,
        is_starter: isAdmin && form.is_starter,
        is_pinned: isAdmin && form.is_pinned,
      });
      onCreated();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>Contribute a Solution</h3>
          <button className="modal-close" onClick={onClose}>&#215;</button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Share a prompt, gem, tool, skill, or workflow with the team. Tag the sales stage so it shows up for the right deals.
        </p>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-danger)', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>Type *</label>
            <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SolType })}>
              <option value="prompt">Prompt</option>
              <option value="gem">Gem (curated insight)</option>
              <option value="tool">Tool</option>
              <option value="skill">Skill</option>
              <option value="workflow">Workflow</option>
            </select>
          </div>
          <div className="form-group">
            <label>Sales Stage *</label>
            <select className="form-input" value={form.sales_stage} onChange={(e) => setForm({ ...form, sales_stage: e.target.value as Stage })}>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            className="form-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g., Discovery questions for Zero Trust deals"
          />
        </div>

        <div className="form-group">
          <label>Short description</label>
          <input
            type="text"
            className="form-input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="One-sentence summary of what this is good for"
          />
        </div>

        <div className="form-group">
          <label>Content *</label>
          <textarea
            className="form-input"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={8}
            placeholder="Paste the prompt, workflow steps, talk track, or skill outline here…"
            style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>Product</label>
            <input
              type="text" className="form-input"
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
              placeholder="e.g., Workers"
            />
          </div>
          <div className="form-group">
            <label>Icon (emoji)</label>
            <input
              type="text" className="form-input"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="🎯"
            />
          </div>
          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input
              type="text" className="form-input"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="ZTNA, MEDDPICC, RFP"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Source URL (optional)</label>
          <input
            type="url" className="form-input"
            value={form.source_url}
            onChange={(e) => setForm({ ...form, source_url: e.target.value })}
            placeholder="https://..."
          />
        </div>

        {isAdmin && (
          <div style={{
            padding: '12px 14px', background: 'rgba(246,130,31,0.05)',
            border: '1px solid rgba(246,130,31,0.2)', borderRadius: 'var(--radius-md)',
            display: 'flex', gap: '14px', marginBottom: '14px',
          }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_starter}
                onChange={(e) => setForm({ ...form, is_starter: e.target.checked })}
                style={{ accentColor: 'var(--cf-orange)' }}
              />
              Add to Starter Pack
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_pinned}
                onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                style={{ accentColor: 'var(--cf-orange)' }}
              />
              Pin to top
            </label>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Submit Solution'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AI Chat modal — stage-aware messaging coach
// ──────────────────────────────────────────────────────────────────────────────

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ skill_id: string; skill_name: string; snippet: string; score: number; source_url: string }>;
  loading?: boolean;
}

function ChatModal({
  onClose, initialStage, contextSolution, userEmail, userName,
}: {
  onClose: () => void;
  initialStage: Stage;
  contextSolution: any | null;
  userEmail: string;
  userName: string;
}) {
  const [stage, setStage] = useState<Stage>(initialStage === 'all' ? 'qualification' : initialStage);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [contextIds, setContextIds] = useState<string[]>(contextSolution ? [contextSolution.id] : []);
  const [contextSols, setContextSols] = useState<any[]>(contextSolution ? [contextSolution] : []);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new turns
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  const stageInfo = STAGES.find(s => s.id === stage)!;

  const send = async () => {
    const message = input.trim();
    if (!message || sending) return;
    setInput('');
    setSending(true);
    const newTurns: ChatTurn[] = [...turns, { role: 'user', content: message }, { role: 'assistant', content: '', loading: true }];
    setTurns(newTurns);
    try {
      const res = await api.aiHub.chat({
        message,
        sales_stage: stage,
        session_id: sessionId,
        user_email: userEmail || undefined,
        user_name: userName || undefined,
        history: turns.slice(-6).map(t => ({ role: t.role, content: t.content })),
        context_solution_ids: contextIds,
      });
      if (!sessionId) setSessionId(res.session_id);
      setTurns(prev => {
        const out = prev.slice();
        out[out.length - 1] = { role: 'assistant', content: res.reply, citations: res.citations };
        return out;
      });
    } catch (e: any) {
      setTurns(prev => {
        const out = prev.slice();
        out[out.length - 1] = { role: 'assistant', content: `Sorry, the AI failed to respond: ${e.message || 'unknown error'}` };
        return out;
      });
    }
    setSending(false);
  };

  const STARTER_QUESTIONS: Record<Stage, string[]> = {
    'all': ['Help me prep for an exec briefing on Cloudflare\'s connectivity cloud strategy.', 'Draft a 3-line value statement for a CFO audience.'],
    'running-business': ['Build me a meeting agenda for a CISO discovery call.', 'Draft a follow-up email after a technical deep dive.'],
    'account-planning': ['Generate an account plan POV for a global retailer evaluating Zero Trust.', 'Suggest 5 outreach angles for a fintech CTO.'],
    'qualification': ['Give me 8 MEDDPICC discovery questions for a Workers AI POC.', 'How should I qualify economic impact for a WAF migration?'],
    'solution-design': ['Draft a 1-page solution narrative for migrating from Akamai to Cloudflare.', 'Compare Cloudflare Access vs. Zscaler ZPA on architecture differentiators.'],
    'negotiation': ['How do I defend price against a 20% discount ask in a 3-year deal?', 'Draft a mutual close plan for a $1.2M ELA.'],
    'renewals': ['Build a QBR storyline highlighting value realization for a 12-month customer.', 'Draft an exec sponsor email for an at-risk renewal.'],
  };

  // When the user opens the coach with a Messaging Playbook artifact attached,
  // surface kind-specific suggestions instead of the generic stage list so the
  // SE can immediately remix or adapt the artifact.
  const playbookKind: PlaybookKind | null = useMemo(() => {
    if (!contextSols.length) return null;
    return getPlaybookKind(contextSols[0]);
  }, [contextSols]);

  const PLAYBOOK_STARTER_QUESTIONS: Record<PlaybookKind, string[]> = {
    'value-prop':  ['Adapt this value statement for a CFO at a healthcare company.', 'Make this 3 lines shorter without losing the architectural punch.', 'Rewrite this for a developer audience.'],
    'discovery':   ['Pick the 3 highest-leverage questions for a 30-min first call.', 'Adapt these for a Zero Trust deal vs. an Application Services deal.', 'Add 3 questions to qualify the economic buyer.'],
    'objection':   ['Rewrite my response if the customer pushes back twice.', 'Adapt this objection handler for {{Vendor X}} specifically.', 'What 1 question would I ask before responding?'],
    'email':       ['Rewrite this email for a {{role/industry}} contact.', 'Make it 30% shorter without losing the call to action.', 'Suggest a follow-up if they do not reply in 5 business days.'],
    'talk-track':  ['Rehearse this with me — ask me clarifying questions you would expect from the customer.', 'What 3 cuts would tighten this for a 15-minute slot?', 'Translate this into a 1-page PDF outline I can hand a customer.'],
    'close':       ['Run me through this trial close as a customer would, then critique my response.', 'Adapt this for a multi-year deal where Year-1 commit matters most.', 'Suggest 2 reciprocity trades I could offer with a 10% discount.'],
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '880px', width: '95vw', height: '88vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, rgba(246,130,31,0.05) 0%, rgba(99,102,241,0.04) 100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--cf-orange), var(--cf-orange-dark))',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px' }}>AI Sales Coach</h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Grounded in cloudflare/skills · Llama 3.3 70B
                </p>
              </div>
            </div>
            <button className="modal-close" onClick={onClose}>&#215;</button>
          </div>

          {/* Stage selector */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {STAGES.map(s => (
              <button
                key={s.id}
                onClick={() => setStage(s.id)}
                style={{
                  padding: '4px 11px', borderRadius: 'var(--radius-full)',
                  border: stage === s.id ? `1.5px solid ${s.accent}` : '1px solid var(--border-color)',
                  background: stage === s.id ? `${s.accent}1a` : 'var(--bg-tertiary)',
                  color: stage === s.id ? s.accent : 'var(--text-secondary)',
                  fontSize: '11px', fontWeight: stage === s.id ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Context solution chips */}
        {contextSols.length > 0 && (
          <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>Context attached:</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {contextSols.map(s => (
                <span key={s.id} style={{
                  padding: '4px 10px', borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  fontSize: '12px', display: 'inline-flex', gap: '6px', alignItems: 'center',
                }}>
                  {s.icon && <span>{s.icon}</span>}
                  {s.title}
                  <button
                    onClick={() => {
                      setContextIds(ids => ids.filter(id => id !== s.id));
                      setContextSols(sols => sols.filter(c => c.id !== s.id));
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '13px', padding: 0, lineHeight: 1 }}
                    aria-label="Remove context"
                  >×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {turns.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                {playbookKind ? (
                  <>You attached <strong>{contextSols[0]?.title}</strong> — a {PLAYBOOK_KINDS.find(k => k.id === playbookKind)?.label.toLowerCase()} artifact for the <strong>{stageInfo.label}</strong> stage. I will ground my answer in the artifact, the official <strong>cloudflare/skills</strong> repo, and general AI knowledge.</>
                ) : (
                  <>Welcome to the AI Sales Coach. I'm grounded in the official <strong>cloudflare/skills</strong> repo on GitHub plus general AI knowledge — pick a sales stage above and ask me anything about messaging, discovery, solution narratives, objections, or competitive positioning.</>
                )}
              </div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  {playbookKind
                    ? `Try one of these with this ${PLAYBOOK_KINDS.find(k => k.id === playbookKind)?.label.toLowerCase()}`
                    : `Try one of these for the ${stageInfo.label.toLowerCase()} stage`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(playbookKind ? PLAYBOOK_STARTER_QUESTIONS[playbookKind] : STARTER_QUESTIONS[stage]).map(q => (
                    <button key={q}
                      onClick={() => { setInput(q); }}
                      style={{
                        textAlign: 'left',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--cf-orange)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {turns.map((t, i) => (
                <ChatBubble key={i} turn={t} />
              ))}
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{ borderTop: '1px solid var(--border-color)', padding: '14px 24px', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Ask anything about ${stageInfo.label.toLowerCase()}…`}
              rows={2}
              disabled={sending}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              style={{
                padding: '10px 18px',
                background: !input.trim() ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--cf-orange), var(--cf-orange-dark))',
                color: !input.trim() ? 'var(--text-tertiary)' : 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: !input.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                height: '48px',
              }}
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Enter to send · Shift+Enter for newline · Stage: <strong style={{ color: stageInfo.accent }}>{stageInfo.label}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '85%',
        padding: '12px 16px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? 'linear-gradient(135deg, var(--cf-orange), var(--cf-orange-dark))' : 'var(--bg-tertiary)',
        color: isUser ? 'white' : 'var(--text-primary)',
        fontSize: '14px',
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        boxShadow: isUser ? '0 2px 8px rgba(246,130,31,0.2)' : 'none',
      }}>
        {turn.loading ? (
          <span style={{ display: 'inline-flex', gap: '4px' }}>
            <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>●</span>
            <span style={{ animation: 'pulse 1s ease-in-out infinite 0.2s' }}>●</span>
            <span style={{ animation: 'pulse 1s ease-in-out infinite 0.4s' }}>●</span>
          </span>
        ) : turn.content}
      </div>
      {turn.citations && turn.citations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '85%', marginLeft: '4px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Grounded in {turn.citations.length} skill chunk{turn.citations.length === 1 ? '' : 's'}
          </div>
          {turn.citations.slice(0, 3).map((c, i) => (
            <a key={i} href={c.source_url} target="_blank" rel="noreferrer"
              style={{
                fontSize: '11px',
                padding: '6px 10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderLeft: '3px solid var(--color-teal)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                lineHeight: 1.4,
              }}
            >
              <strong style={{ color: 'var(--cf-orange)' }}>{c.skill_name}</strong> · {(c.score * 100).toFixed(0)}% match
              <div style={{ marginTop: '2px', color: 'var(--text-tertiary)' }}>
                {c.snippet.slice(0, 180)}{c.snippet.length > 180 ? '…' : ''}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin: Cloudflare GitHub skills knowledge base management
// ──────────────────────────────────────────────────────────────────────────────

function AdminKnowledgeModal({ onClose, skills }: { onClose: () => void; skills: any[] }) {
  const [discovered, setDiscovered] = useState<any[] | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<any | null>(null);
  const [repo, setRepo] = useState('cloudflare/skills');
  const [branch, setBranch] = useState('main');

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscovered(null);
    try {
      const res = await api.aiHub.discoverSkills({ repo, branch });
      setDiscovered(res.skills || []);
      setSelected(new Set((res.skills || []).map((s: any) => s.id)));
    } catch (e: any) {
      alert(`Discover failed: ${e.message || 'unknown error'}`);
    }
    setDiscovering(false);
  };

  const handleIngest = async () => {
    if (selected.size === 0) { alert('Pick at least one skill to ingest.'); return; }
    if (!confirm(`Embed ${selected.size} skill(s) into Vectorize? This re-indexes any that were already ingested.`)) return;
    setIngesting(true);
    setResults(null);
    try {
      const res = await api.aiHub.ingestSkills({ repo, branch, skills: Array.from(selected) });
      setResults(res);
    } catch (e: any) {
      alert(`Ingest failed: ${e.message || 'unknown error'}`);
    }
    setIngesting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Remove skill "${id}" from the knowledge base?`)) return;
    try {
      await api.aiHub.deleteSkill(id);
      // soft-refresh by removing locally
      const idx = skills.findIndex(s => s.id === id);
      if (idx >= 0) skills.splice(idx, 1);
      setResults({ deleted: id });
    } catch (e: any) {
      alert(`Delete failed: ${e.message || 'unknown error'}`);
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toShow = discovered || skills.map(s => ({
    id: s.id, name: s.name, source_url: s.source_url, github_path: s.github_path,
  }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>AI Hub Knowledge Base</h3>
          <button className="modal-close" onClick={onClose}>&#215;</button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Pull SKILL.md files from a GitHub repo (default: <code>cloudflare/skills</code>), chunk them, embed with bge-base-en-v1.5, and store in Vectorize so the AI Coach can ground its answers.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>GitHub Repo</label>
            <input className="form-input" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="cloudflare/skills" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Branch</label>
            <input className="form-input" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <button onClick={handleDiscover} className="btn-secondary" disabled={discovering}>
            {discovering ? 'Discovering…' : 'Discover skills from GitHub'}
          </button>
          <button onClick={handleIngest} disabled={ingesting || selected.size === 0}>
            {ingesting ? 'Ingesting…' : `Ingest ${selected.size} selected`}
          </button>
        </div>

        {results && (
          <div style={{
            padding: '10px 14px', background: 'var(--color-success-light)',
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px',
            fontSize: '13px', color: 'var(--color-success)', marginBottom: '12px',
          }}>
            {results.ingested ? `✓ Ingested ${results.ingested} skill(s)` : ''}
            {results.failed ? ` · ${results.failed} failed` : ''}
            {results.deleted ? `Removed ${results.deleted}` : ''}
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            {discovered ? 'Discovered (pick what to ingest)' : 'Currently indexed'}
          </div>
          {toShow.length === 0 ? (
            <EmptyState text="No skills yet. Click 'Discover skills from GitHub' to fetch the list." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
              {toShow.map((s: any) => {
                const indexed = skills.find(x => x.id === s.id);
                return (
                  <div key={s.id} style={{
                    padding: '10px 12px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    {discovered && (
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                        style={{ accentColor: 'var(--cf-orange)' }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.name || s.id}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {s.github_path || s.source_url}
                        {indexed?.chunks_count ? ` · ${indexed.chunks_count} chunks` : ''}
                        {indexed?.last_indexed_at ? ` · indexed ${relativeTime(indexed.last_indexed_at)}` : ''}
                      </div>
                    </div>
                    {indexed?.status === 'indexed' && (
                      <span className="badge badge-green">indexed</span>
                    )}
                    {indexed?.status === 'failed' && (
                      <span className="badge badge-red">failed</span>
                    )}
                    {indexed?.status === 'indexing' && (
                      <span className="badge badge-yellow">indexing</span>
                    )}
                    {indexed && (
                      <button onClick={() => handleDelete(s.id)}
                        className="btn-secondary btn-sm"
                        style={{ color: 'var(--color-danger)', padding: '4px 10px' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: '14px' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
