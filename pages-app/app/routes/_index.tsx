import { useState, useEffect } from "react";
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

export default function Index() {
  const navigate = useNavigate();
  const { currentUserName } = useAdmin();
  const [metrics, setMetrics] = useState({
    assets: 0, scripts: 0, events: 0, announcements: 0,
    shoutouts: 0, polls: 0, competitions: 0, featureRequests: 0, skills: 0
  });
  const [latestShoutouts, setLatestShoutouts] = useState<any[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null);
  const [activePolls, setActivePolls] = useState<any[]>([]);
  const [topFeatureRequests, setTopFeatureRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [urlAssets, fileAssets, scripts, events, announcements, shoutouts, polls, competitions, featureRequests, allAssessments] = await Promise.all([
          api.urlAssets.getAll(), api.fileAssets.getAll(), api.scripts.getAll(),
          api.events.getAll(), api.announcements.getAll(), api.shoutouts.getAll(),
          api.polls.getAll(), api.competitions.getAll(), api.featureRequests.getAll(),
          api.skillAssessments.getAll(),
        ]) as [any[], any[], any[], any[], any[], any[], any[], any[], any[], any[]];

        setMetrics({
          assets: urlAssets.length + fileAssets.length,
          scripts: scripts.length, events: events.length,
          announcements: announcements.length, shoutouts: shoutouts.length,
          polls: polls.length,
          competitions: competitions.filter((c: any) => c.status === 'active').length,
          featureRequests: featureRequests.length,
          skills: Array.isArray(allAssessments) ? new Set(allAssessments.map((a: any) => a.user_email)).size : 0,
        });

        setLatestShoutouts(shoutouts.slice(0, 3));
        if (events.length > 0) setNextEvent(events[0]);
        if (announcements.length > 0) setLatestAnnouncement(announcements[0]);

        const sortedPolls = [...polls].sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));
        setActivePolls(sortedPolls.slice(0, 2));

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

  // Quick nav tiles data
  const navTiles = [
    { label: 'Assets', icon: '📦', count: metrics.assets, path: '/assets', color: '#F6821F', subtitle: 'Templates & guides' },
    { label: 'Scripts', icon: '💻', count: metrics.scripts, path: '/scripts', color: '#0051C3', subtitle: 'Code snippets' },
    { label: 'Events', icon: '📅', count: metrics.events, path: '/events', color: '#10B981', subtitle: 'Upcoming' },
    { label: 'Shoutouts', icon: '🎉', count: metrics.shoutouts, path: '/shoutouts', color: '#8B5CF6', subtitle: 'Recognition' },
    { label: 'Polls', icon: '📊', count: metrics.polls, path: '/polls', color: '#F59E0B', subtitle: 'Cast your vote' },
    { label: 'Competitions', icon: '🏆', count: metrics.competitions, path: '/competitions', color: '#EC4899', subtitle: 'Win prizes' },
    { label: 'Features', icon: '💡', count: metrics.featureRequests, path: '/feature-requests', color: '#14B8A6', subtitle: 'Vote & track' },
    { label: 'Skills', icon: '🎯', count: metrics.skills, path: '/skills-matrix', color: '#6366F1', subtitle: 'SEs assessed' },
    { label: 'Announcements', icon: '📢', count: metrics.announcements, path: '/announcements', color: '#EF4444', subtitle: 'Updates' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--cf-orange)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Section */}
      <div style={{
        padding: '2.5rem 2rem',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
        border: '1px solid var(--border-color)',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-20px',
          width: '280px', height: '280px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(246,130,31,0.06), rgba(0,81,195,0.06))',
          filter: 'blur(40px)',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: '0 0 4px 0', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500 }}>
            {greeting()}{currentUserName ? `, ${currentUserName}` : ''}
          </p>
          <h1 style={{
            fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Welcome to SolutionHub
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0, maxWidth: '500px', lineHeight: 1.5 }}>
            Your team's central hub for assets, knowledge sharing, and collaboration.
          </p>
        </div>
      </div>

      {/* Quick Navigation Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '12px',
        marginBottom: '2rem',
      }}>
        {navTiles.map(tile => (
          <div
            key={tile.path}
            onClick={() => navigate(tile.path)}
            style={{
              padding: '16px 12px',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = tile.color;
              e.currentTarget.style.boxShadow = `0 8px 24px ${tile.color}18`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{tile.icon}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: tile.color, lineHeight: 1, marginBottom: '4px', fontFamily: "'DM Serif Display', serif" }}>
              {tile.count}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
              {tile.label}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
              {tile.subtitle}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '2rem',
      }}>

        {/* Latest Announcement - Featured */}
        {latestAnnouncement && (
          <div
            onClick={() => navigate('/announcements')}
            style={{
              gridColumn: 'span 2',
              padding: '20px 24px',
              borderRadius: '12px',
              background: latestAnnouncement.priority === 'urgent'
                ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, var(--bg-secondary) 100%)'
                : 'var(--bg-secondary)',
              border: `1px solid ${latestAnnouncement.priority === 'urgent' ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              gap: '16px',
              alignItems: 'start',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              background: latestAnnouncement.priority === 'urgent' ? 'rgba(239,68,68,0.12)' :
                         latestAnnouncement.priority === 'high' ? 'rgba(245,158,11,0.12)' : 'rgba(0,81,195,0.12)',
            }}>
              {latestAnnouncement.priority === 'urgent' ? '🚨' : latestAnnouncement.priority === 'high' ? '⚠️' : '📢'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: latestAnnouncement.priority === 'urgent' ? '#EF4444' :
                         latestAnnouncement.priority === 'high' ? '#F59E0B' : 'var(--cf-blue)',
                }}>
                  {latestAnnouncement.priority === 'urgent' ? 'Urgent' : latestAnnouncement.priority === 'high' ? 'High Priority' : 'Announcement'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{latestAnnouncement.date}</span>
              </div>
              <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
                {latestAnnouncement.title}
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {latestAnnouncement.message.length > 140 ? latestAnnouncement.message.substring(0, 140) + '...' : latestAnnouncement.message}
              </p>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', flexShrink: 0 }}>→</span>
          </div>
        )}

        {/* Latest Shoutouts */}
        <div style={{
          padding: '20px 24px', borderRadius: '12px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🎉</span> Recent Shoutouts
            </h3>
            <span
              onClick={() => navigate('/shoutouts')}
              style={{ fontSize: '12px', color: 'var(--cf-blue)', cursor: 'pointer', fontWeight: 500 }}
            >
              View all →
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {latestShoutouts.length > 0 ? latestShoutouts.map((s) => (
              <div key={s.id} style={{
                padding: '12px', borderRadius: '8px',
                background: 'var(--bg-tertiary)',
                borderLeft: '3px solid #8B5CF6',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{s.from_user} → {s.to_user}</span>
                  <span style={{
                    fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                    background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', fontWeight: 600, textTransform: 'capitalize',
                  }}>
                    {s.category}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {s.message.length > 90 ? s.message.substring(0, 90) + '...' : s.message}
                </p>
              </div>
            )) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', margin: 0 }}>No shoutouts yet. Be the first to recognize a teammate!</p>
            )}
          </div>
        </div>

        {/* Right column: Event + Polls stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Next Event */}
          <div
            onClick={() => navigate('/events')}
            style={{
              padding: '20px 24px', borderRadius: '12px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              cursor: 'pointer', transition: 'all 0.2s ease', flex: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📅</span> Next Event
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--cf-blue)', fontWeight: 500 }}>View all →</span>
            </div>
            {nextEvent ? (
              <div>
                <p style={{ margin: '0 0 6px 0', fontWeight: 600, fontSize: '15px', color: 'var(--cf-orange)' }}>{nextEvent.title}</p>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>📍 {nextEvent.location || 'TBD'}</span>
                  <span>{nextEvent.date}</span>
                  <span>{nextEvent.time}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', margin: 0 }}>No upcoming events scheduled</p>
            )}
          </div>

          {/* Active Polls */}
          <div
            onClick={() => navigate('/polls')}
            style={{
              padding: '20px 24px', borderRadius: '12px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              cursor: 'pointer', transition: 'all 0.2s ease', flex: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📊</span> Active Polls
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--cf-blue)', fontWeight: 500 }}>Vote →</span>
            </div>
            {activePolls.length > 0 ? activePolls.map((poll) => (
              <div key={poll.id} style={{
                padding: '10px 12px', borderRadius: '8px',
                background: 'var(--bg-tertiary)', marginBottom: '8px',
              }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 500 }}>{poll.question}</p>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {poll.totalVotes || 0} vote{poll.totalVotes !== 1 ? 's' : ''}
                </span>
              </div>
            )) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', margin: 0 }}>No active polls</p>
            )}
          </div>
        </div>

        {/* Top Feature Requests - Full width */}
        <div style={{
          gridColumn: 'span 2',
          padding: '20px 24px', borderRadius: '12px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>💡</span> Top Feature Requests
            </h3>
            <span
              onClick={(e) => { e.stopPropagation(); navigate('/feature-requests'); }}
              style={{ fontSize: '12px', color: 'var(--cf-blue)', cursor: 'pointer', fontWeight: 500 }}
            >
              View all →
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {topFeatureRequests.length > 0 ? topFeatureRequests.map((request, i) => (
              <div
                key={request.id}
                onClick={() => navigate('/feature-requests')}
                style={{
                  padding: '14px 16px', borderRadius: '10px',
                  background: 'var(--bg-tertiary)',
                  borderLeft: `3px solid ${['#14B8A6', '#F59E0B', '#6366F1'][i] || 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px', marginBottom: '8px' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', flex: 1, lineHeight: 1.3 }}>
                    {request.feature.length > 70 ? request.feature.substring(0, 70) + '...' : request.feature}
                  </p>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                    background: 'var(--cf-blue)', color: 'white', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {request.product_name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 600 }}>▲ {request.upvotes}</span>
                  <span style={{ color: '#10B981', fontWeight: 600 }}>{formatCurrency(request.opportunity_value)}</span>
                  <span>{request.opportunities?.length || 0} SE{request.opportunities?.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', margin: 0 }}>No feature requests yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div style={{
        display: 'flex', gap: '10px', flexWrap: 'wrap',
        padding: '16px 20px', borderRadius: '12px',
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        marginBottom: '2rem', alignItems: 'center',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '4px' }}>Quick Actions</span>
        {[
          { label: 'Upload Asset', path: '/assets', icon: '📦' },
          { label: 'Share Script', path: '/scripts', icon: '💻' },
          { label: 'Give Shoutout', path: '/shoutouts', icon: '🎉' },
          { label: 'Submit Feature', path: '/feature-requests', icon: '💡' },
          { label: 'Assess Skills', path: '/skills-matrix', icon: '🎯' },
        ].map(action => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: 500,
              background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
              border: '1px solid var(--border-color)', borderRadius: '8px',
              cursor: 'pointer', transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cf-orange)'; e.currentTarget.style.color = 'var(--cf-orange)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          >
            <span>{action.icon}</span> {action.label}
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', padding: '0 0 2rem' }}>
        SolutionHub by Cloudflare SE Team
      </div>
    </div>
  );
}
