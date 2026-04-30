import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { useAdmin } from "../contexts/AdminContext";

export function meta() {
  return [
    { title: "SolutionHub - Dashboard" },
    { name: "description", content: "Solution Engineering Portal Dashboard" },
  ];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

/** Animated counter hook */
function useAnimatedNumber(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = ref.current;
    const diff = target - start;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setValue(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = target;
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

function StatCard({ card, navigate }: { card: { label: string; icon: string; count: number; path: string; gradient: string; subtitle: string }; navigate: (path: string) => void }) {
  const animatedCount = useAnimatedNumber(card.count);
  return (
    <div
      onClick={() => navigate(card.path)}
      style={{
        background: card.gradient,
        padding: '24px 28px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        minHeight: '140px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.1)';
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.zIndex = '2';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = 'brightness(1)';
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.zIndex = '1';
      }}
    >
      {/* Background icon */}
      <div style={{
        position: 'absolute', bottom: '-10px', right: '-5px',
        fontSize: '90px', opacity: 0.15,
        transform: 'rotate(-12deg)',
        lineHeight: 1,
        pointerEvents: 'none',
      }}>
        {card.icon}
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'rgba(255,255,255,0.85)', marginBottom: '12px',
        }}>
          {card.label}
        </div>
        <div style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: '48px', fontWeight: 400, color: 'white',
          lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {animatedCount}
        </div>
      </div>
      <div style={{
        fontSize: '13px', color: 'rgba(255,255,255,0.75)',
        position: 'relative', zIndex: 1,
      }}>
        {card.subtitle} →
      </div>
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { currentUserName } = useAdmin();
  const [metrics, setMetrics] = useState({
    assets: 0, scripts: 0, events: 0, announcements: 0,
    shoutouts: 0, videos: 0, competitions: 0, featureRequests: 0, skills: 0,
    aiSolutions: 0,
  });
  const [latestShoutouts, setLatestShoutouts] = useState<any[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null);
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [topFeatureRequests, setTopFeatureRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [urlAssets, fileAssets, scripts, events, announcements, shoutouts, videos, competitions, featureRequests, allAssessments, aiHubStats] = await Promise.all([
          api.urlAssets.getAll(), api.fileAssets.getAll(), api.scripts.getAll(),
          api.events.getAll(), api.announcements.getAll(), api.shoutouts.getAll(),
          api.videos.getAll().catch(() => []),
          api.competitions.getAll(), api.featureRequests.getAll(),
          api.skillAssessments.getAll(),
          api.aiHub.stats().catch(() => ({ total: 0 })),
        ]) as [any[], any[], any[], any[], any[], any[], any[], any[], any[], any[], any];

        setMetrics({
          assets: urlAssets.length + fileAssets.length,
          scripts: scripts.length, events: events.length,
          announcements: announcements.length, shoutouts: shoutouts.length,
          videos: videos.length,
          competitions: competitions.filter((c: any) => c.status === 'active').length,
          featureRequests: featureRequests.length,
          skills: Array.isArray(allAssessments) ? new Set(allAssessments.map((a: any) => a.user_email)).size : 0,
          aiSolutions: aiHubStats?.total || 0,
        });

        setLatestShoutouts(shoutouts.slice(0, 3));
        if (events.length > 0) setNextEvent(events[0]);
        if (announcements.length > 0) setLatestAnnouncement(announcements[0]);
        setRecentVideos(
          [...videos]
            // Show any video whose Stream playback is ready — don't wait for transcription
            .filter((v: any) => !!v.playback_url)
            .sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))
            .slice(0, 2)
        );
        setTopFeatureRequests(featureRequests.slice(0, 3));
      } catch (e) {
        console.error('Error loading data:', e);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const statCards = [
    { label: 'AI Hub', icon: '🤖', count: metrics.aiSolutions, path: '/ai-hub', gradient: 'linear-gradient(135deg, #F6821F 0%, #B85100 100%)', subtitle: 'AI prompts, gems & coach' },
    { label: 'Shared Assets', icon: '📦', count: metrics.assets, path: '/assets', gradient: 'linear-gradient(135deg, #F6821F 0%, #E55D0A 100%)', subtitle: 'Templates, guides & more' },
    { label: 'Code Scripts', icon: '💻', count: metrics.scripts, path: '/scripts', gradient: 'linear-gradient(135deg, #0051C3 0%, #003A8C 100%)', subtitle: 'Ready to use' },
    { label: 'Upcoming Events', icon: '📅', count: metrics.events, path: '/events', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', subtitle: 'This month' },
    { label: 'Announcements', icon: '📢', count: metrics.announcements, path: '/announcements', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', subtitle: 'Important updates' },
    { label: 'Team Shoutouts', icon: '🎉', count: metrics.shoutouts, path: '/shoutouts', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', subtitle: 'All time' },
    { label: 'Learning Hub', icon: '🎬', count: metrics.videos, path: '/learning', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', subtitle: 'Training videos & playbooks' },
    { label: 'Competitions', icon: '🏆', count: metrics.competitions, path: '/competitions', gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)', subtitle: 'Win prizes' },
    { label: 'Feature Requests', icon: '💡', count: metrics.featureRequests, path: '/feature-requests', gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)', subtitle: 'Vote & track' },
    { label: 'Skills Matrix', icon: '🎯', count: metrics.skills, path: '/skills-matrix', gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', subtitle: 'SEs assessed' },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span className="loading-text">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* ---- Hero with Gradient Mesh ---- */}
      <div
        className="animate-in"
        style={{
          padding: '40px 36px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated gradient orbs */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-40px',
          width: '350px', height: '350px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(246,130,31,0.1) 0%, transparent 70%)',
          animation: 'gradientOrb 8s ease-in-out infinite', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', left: '-60px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
          animation: 'gradientOrb 10s ease-in-out infinite reverse', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{
            fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 8px 0',
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
          }}>
            {greeting()}{currentUserName ? `, ${currentUserName}` : ''}
          </p>
          <h1 style={{
            fontSize: '36px', fontWeight: 800, margin: '0 0 10px 0', letterSpacing: '-0.04em',
            lineHeight: 1.1,
            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 60%, var(--cf-orange) 100%)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Welcome to SolutionHub
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.5, whiteSpace: 'nowrap' }}>
            Your team's central hub for assets, knowledge sharing, and collaboration.
          </p>
        </div>
      </div>

      {/* ---- Colorful Stat Cards Grid ---- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '2px',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '2rem',
      }}>
        {statCards.map((card) => (
          <StatCard key={card.path} card={card} navigate={navigate} />
        ))}
      </div>

      {/* ---- Bento Content Grid ---- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '24px',
      }}>

        {/* Latest Announcement */}
        {latestAnnouncement && (
          <div
            className="animate-in"
            onClick={() => navigate('/announcements')}
            style={{
              animationDelay: '0.3s',
              gridColumn: 'span 2',
              padding: '20px 24px',
              borderRadius: 'var(--radius-lg)',
              background: latestAnnouncement.priority === 'urgent' ? 'var(--color-danger-light)' : 'var(--bg-secondary)',
              border: `1px solid ${latestAnnouncement.priority === 'urgent' ? 'rgba(239,68,68,0.15)' : 'var(--border-color)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex', gap: '16px', alignItems: 'start',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: latestAnnouncement.priority === 'urgent' ? 'rgba(239,68,68,0.12)' :
                         latestAnnouncement.priority === 'high' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.08)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                stroke={latestAnnouncement.priority === 'urgent' ? '#EF4444' : latestAnnouncement.priority === 'high' ? '#F59E0B' : '#3B82F6'}>
                <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className={`badge ${latestAnnouncement.priority === 'urgent' ? 'badge-red' : latestAnnouncement.priority === 'high' ? 'badge-yellow' : 'badge-blue'}`}
                  style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {latestAnnouncement.priority === 'urgent' ? 'Urgent' : latestAnnouncement.priority === 'high' ? 'High' : 'New'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{latestAnnouncement.date}</span>
              </div>
              <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{latestAnnouncement.title}</p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 'none' }}>
                {latestAnnouncement.message.length > 120 ? latestAnnouncement.message.substring(0, 120) + '...' : latestAnnouncement.message}
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '4px', opacity: 0.5 }}>
              <path d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}

        {/* Recent Shoutouts */}
        <div className="animate-in" style={{
          animationDelay: '0.35s',
          padding: '22px', borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        }}>
          <div className="section-header">
            <h4 className="section-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              Recent Shoutouts
            </h4>
            <span className="section-link" onClick={() => navigate('/shoutouts')}>View all</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {latestShoutouts.length > 0 ? latestShoutouts.map((s) => (
              <div key={s.id} style={{
                padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-tertiary)', borderLeft: '3px solid #8B5CF6',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.from_user} &rarr; {s.to_user}</span>
                  <span className="badge badge-purple" style={{ fontSize: '10px', textTransform: 'capitalize' }}>{s.category}</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 'none' }}>
                  {s.message.length > 80 ? s.message.substring(0, 80) + '...' : s.message}
                </p>
              </div>
            )) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>No shoutouts yet</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Next Event */}
          <div className="animate-in" onClick={() => navigate('/events')} style={{
            animationDelay: '0.4s',
            padding: '22px', borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            cursor: 'pointer', transition: 'all 0.2s ease', flex: 1,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div className="section-header">
              <h4 className="section-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Next Event
              </h4>
              <span className="section-link">View all</span>
            </div>
            {nextEvent ? (
              <div>
                <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{nextEvent.title}</p>
                <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    {nextEvent.location || 'TBD'}
                  </span>
                  <span>{nextEvent.date}</span>
                  <span>{nextEvent.time}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>No upcoming events</p>
            )}
          </div>

          {/* Learning Hub - Popular Videos */}
          <div className="animate-in" onClick={() => navigate('/learning')} style={{
            animationDelay: '0.45s',
            padding: '22px', borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            cursor: 'pointer', transition: 'all 0.2s ease', flex: 1,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div className="section-header">
              <h4 className="section-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Popular Trainings
              </h4>
              <span className="section-link">Watch</span>
            </div>
            {recentVideos.length > 0 ? recentVideos.map((v) => (
              <div
                key={v.id}
                onClick={(e) => { e.stopPropagation(); navigate(`/learning?v=${v.id}`); }}
                style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-tertiary)', marginBottom: '6px',
                  cursor: 'pointer',
                }}
              >
                <p style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{v.title}</p>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{v.view_count || 0} views · {v.category || 'General'}</span>
              </div>
            )) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>No training videos yet &mdash; upload the first one</p>
            )}
          </div>
        </div>

        {/* Feature Requests */}
        <div className="animate-in" style={{
          animationDelay: '0.5s', gridColumn: 'span 2',
          padding: '22px', borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        }}>
          <div className="section-header">
            <h4 className="section-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              Top Feature Requests
            </h4>
            <span className="section-link" onClick={(e) => { e.stopPropagation(); navigate('/feature-requests'); }}>View all</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
            {topFeatureRequests.length > 0 ? topFeatureRequests.map((request, i) => {
              const colors = ['#14B8A6', '#F59E0B', '#6366F1'];
              return (
                <div key={request.id} onClick={() => navigate('/feature-requests')} style={{
                  padding: '14px 16px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-tertiary)', borderLeft: `3px solid ${colors[i] || 'var(--border-color)'}`,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px', marginBottom: '8px' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', flex: 1, lineHeight: 1.4, color: 'var(--text-primary)' }}>
                      {request.feature.length > 65 ? request.feature.substring(0, 65) + '...' : request.feature}
                    </p>
                    <span className="badge badge-blue" style={{ fontSize: '10px', flexShrink: 0 }}>{request.product_name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    <span style={{ fontWeight: 600 }}>&#9650; {request.upvotes}</span>
                    <span style={{ color: '#10B981', fontWeight: 600 }}>{formatCurrency(request.opportunity_value)}</span>
                    <span>{request.opportunities?.length || 0} SEs</span>
                  </div>
                </div>
              );
            }) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>No feature requests yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="animate-in" style={{
        animationDelay: '0.55s',
        display: 'flex', gap: '6px', flexWrap: 'wrap',
        padding: '14px 18px', borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        marginBottom: '24px', alignItems: 'center',
      }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', marginRight: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Actions</span>
        {[
          { label: 'Upload Asset', path: '/assets', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
          { label: 'Share Script', path: '/scripts', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
          { label: 'Give Shoutout', path: '/shoutouts', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
          { label: 'Submit Feature', path: '/feature-requests', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
          { label: 'Assess Skills', path: '/skills-matrix', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        ].map(action => (
          <button key={action.path} className="btn-secondary btn-sm" onClick={() => navigate(action.path)}
            style={{ borderRadius: 'var(--radius-full)', gap: '5px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={action.icon}/></svg>
            {action.label}
          </button>
        ))}
      </div>

      <div className="page-footer">SolutionHub by Cloudflare SE Team</div>
    </div>
  );
}
