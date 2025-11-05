import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";

export function meta() {
  return [
    { title: "SE Portal - Dashboard" },
    { name: "description", content: "Solution Engineering Portal Dashboard" },
  ];
}

export default function Index() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    assets: 0,
    scripts: 0,
    events: 0,
    announcements: 0,
    shoutouts: 0,
    polls: 0
  });
  const [latestShoutouts, setLatestShoutouts] = useState<any[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null);
  const [activePolls, setActivePolls] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('[DASHBOARD DEBUG] Loading dashboard data...');
        const [urlAssets, fileAssets, scripts, events, announcements, shoutouts, polls] = await Promise.all([
          api.urlAssets.getAll(),
          api.fileAssets.getAll(),
          api.scripts.getAll(),
          api.events.getAll(),
          api.announcements.getAll(),
          api.shoutouts.getAll(),
          api.polls.getAll(),
        ]);

        console.log('[DASHBOARD DEBUG] Data loaded:', {
          urlAssets: urlAssets.length,
          fileAssets: fileAssets.length,
          scripts: scripts.length,
          events: events.length,
          announcements: announcements.length,
          shoutouts: shoutouts.length,
          polls: polls.length
        });

        setMetrics({
          assets: urlAssets.length + fileAssets.length,
          scripts: scripts.length,
          events: events.length,
          announcements: announcements.length,
          shoutouts: shoutouts.length,
          polls: polls.length,
        });

        // Get latest 2 shoutouts
        setLatestShoutouts(shoutouts.slice(0, 2));
        console.log('[DASHBOARD DEBUG] Latest shoutouts:', shoutouts.slice(0, 2));

        // Get next event
        if (events.length > 0) {
          setNextEvent(events[0]);
          console.log('[DASHBOARD DEBUG] Next event:', events[0]);
        }

        // Get latest announcement
        if (announcements.length > 0) {
          setLatestAnnouncement(announcements[0]);
        }

        // Get top 2 active polls (by total votes)
        const sortedPolls = [...polls].sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));
        setActivePolls(sortedPolls.slice(0, 2));
      } catch (e) {
        console.error('[DASHBOARD DEBUG] Error loading data:', e);
      }
    };

    loadData();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2>Welcome to SE Portal</h2>
        <p>Your hub for shared assets, scripts, events, and team recognition</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border-color)', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <div
          className="stat-card"
          onClick={() => navigate('/assets')}
          style={{ background: 'linear-gradient(135deg, #F6821F 0%, #E06717 100%)', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Shared Assets</div>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.assets}</div>
          <div className="stat-change" style={{ color: 'rgba(255,255,255,0.8)' }}>Templates, guides & more →</div>
        </div>

        <div
          className="stat-card"
          onClick={() => navigate('/scripts')}
          style={{ background: 'linear-gradient(135deg, #0051C3 0%, #003A8C 100%)', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Code Scripts</div>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.scripts}</div>
          <div className="stat-change" style={{ color: 'rgba(255,255,255,0.8)' }}>Ready to use →</div>
        </div>

        <div
          className="stat-card"
          onClick={() => navigate('/events')}
          style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Upcoming Events</div>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.events}</div>
          <div className="stat-change" style={{ color: 'rgba(255,255,255,0.8)' }}>This month →</div>
        </div>

        <div
          className="stat-card"
          onClick={() => navigate('/announcements')}
          style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Announcements</div>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.announcements}</div>
          <div className="stat-change" style={{ color: 'rgba(255,255,255,0.8)' }}>Important updates →</div>
        </div>

        <div
          className="stat-card"
          onClick={() => navigate('/shoutouts')}
          style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Team Shoutouts</div>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.shoutouts}</div>
          <div className="stat-change" style={{ color: 'rgba(255,255,255,0.8)' }}>All time →</div>
        </div>

        <div
          className="stat-card"
          onClick={() => navigate('/polls')}
          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Active Polls</div>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.polls}</div>
          <div className="stat-change" style={{ color: 'rgba(255,255,255,0.8)' }}>Cast your vote →</div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginTop: "2rem" }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3>🎉 Latest Shoutouts</h3>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {latestShoutouts.length > 0 ? latestShoutouts.map((shoutout, i) => (
              <div key={shoutout.id} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: `3px solid ${i === 0 ? 'var(--cf-orange)' : 'var(--cf-blue)'}` }}>
                <p style={{ margin: 0, fontWeight: '600' }}>{shoutout.from_user} → {shoutout.to_user}</p>
                <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>{shoutout.message.substring(0, 80)}... - {shoutout.date}</p>
              </div>
            )) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No shoutouts yet</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3>📅 Next Event</h3>
          <div style={{ marginTop: '1rem' }}>
            {nextEvent ? (
              <>
                <p style={{ fontWeight: '600', fontSize: '1.125rem', margin: '0.5rem 0', color: 'var(--cf-orange)' }}>{nextEvent.title}</p>
                <p style={{ fontSize: '0.875rem', margin: '0.25rem 0' }}>📍 {nextEvent.date}, {nextEvent.time}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{nextEvent.description}</p>
              </>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No upcoming events</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3>📢 Latest Announcement</h3>
          <div style={{ marginTop: '1rem' }}>
            {latestAnnouncement ? (
              <>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  background: latestAnnouncement.priority === 'urgent' ? 'rgba(239, 68, 68, 0.1)' :
                             latestAnnouncement.priority === 'high' ? 'rgba(245, 158, 11, 0.1)' :
                             latestAnnouncement.priority === 'normal' ? 'rgba(0, 81, 195, 0.1)' :
                             'rgba(107, 114, 128, 0.1)',
                  color: latestAnnouncement.priority === 'urgent' ? '#EF4444' :
                        latestAnnouncement.priority === 'high' ? '#F59E0B' :
                        latestAnnouncement.priority === 'normal' ? 'var(--cf-blue)' :
                        '#6B7280'
                }}>
                  {latestAnnouncement.priority === 'urgent' ? '🚨 Urgent' :
                   latestAnnouncement.priority === 'high' ? '⚠️ High Priority' :
                   latestAnnouncement.priority === 'normal' ? '📢 Normal' :
                   'ℹ️ FYI'}
                </div>
                <p style={{ fontWeight: '600', fontSize: '1.125rem', margin: '0.5rem 0', color: 'var(--text-primary)' }}>
                  {latestAnnouncement.title}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                  {latestAnnouncement.message.length > 100
                    ? latestAnnouncement.message.substring(0, 100) + '...'
                    : latestAnnouncement.message}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                  By {latestAnnouncement.author} • {latestAnnouncement.date}
                </p>
              </>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No announcements yet</p>
            )}
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3>📊 Active Polls</h3>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activePolls.length > 0 ? activePolls.map((poll, i) => (
              <div key={poll.id} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: `3px solid ${i === 0 ? '#F59E0B' : 'var(--cf-blue)'}` }}>
                <p style={{ margin: 0, fontWeight: '600' }}>{poll.question}</p>
                <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
                  {poll.totalVotes || 0} {poll.totalVotes === 1 ? 'vote' : 'votes'} • {poll.date}
                </p>
              </div>
            )) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No active polls yet</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3>🚀 Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={() => navigate('/assets?action=upload')}>Upload Asset</button>
            <button
              onClick={() => navigate('/scripts?action=share')}
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '2px solid var(--border-color)' }}
            >
              Share Script
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
