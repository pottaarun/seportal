import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function meta() {
  return [
    { title: "SE Portal - Dashboard" },
    { name: "description", content: "Solution Engineering Portal Dashboard" },
  ];
}

export default function Index() {
  const [metrics, setMetrics] = useState({
    assets: 0,
    scripts: 0,
    events: 0,
    shoutouts: 0
  });

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const [urlAssets, fileAssets, scripts, events, shoutouts] = await Promise.all([
          api.urlAssets.getAll(),
          api.fileAssets.getAll(),
          api.scripts.getAll(),
          api.events.getAll(),
          api.shoutouts.getAll(),
        ]);

        setMetrics({
          assets: urlAssets.length + fileAssets.length,
          scripts: scripts.length,
          events: events.length,
          shoutouts: shoutouts.length,
        });
      } catch (e) {
        console.error('Error loading metrics:', e);
      }
    };

    loadMetrics();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2>Welcome to SE Portal</h2>
        <p>Your hub for shared assets, scripts, events, and team recognition</p>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #F6821F 0%, #E06717 100%)', color: 'white', border: 'none' }}>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Shared Assets</div>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.assets}</div>
          <div className="stat-change" style={{ color: 'rgba(255,255,255,0.8)' }}>Templates, guides & more</div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #0051C3 0%, #003A8C 100%)', color: 'white', border: 'none' }}>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Code Scripts</div>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.scripts}</div>
          <div className="stat-change" style={{ color: 'rgba(255,255,255,0.8)' }}>Ready to use</div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white', border: 'none' }}>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Upcoming Events</div>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.events}</div>
          <div className="stat-change" style={{ color: 'rgba(255,255,255,0.8)' }}>This month</div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', color: 'white', border: 'none' }}>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Team Shoutouts</div>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.shoutouts}</div>
          <div className="stat-change" style={{ color: 'rgba(255,255,255,0.8)' }}>All time</div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginTop: "2rem" }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3>🎉 Latest Shoutouts</h3>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: '3px solid var(--cf-orange)' }}>
              <p style={{ margin: 0, fontWeight: '600' }}>Amazing demo by Sarah!</p>
              <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>Crushed the customer presentation - 2 hours ago</p>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: '3px solid var(--cf-blue)' }}>
              <p style={{ margin: 0, fontWeight: '600' }}>Mike shipped new automation!</p>
              <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>Saved the team 10 hours/week - yesterday</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>📅 Next Event</h3>
          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontWeight: '600', fontSize: '1.125rem', margin: '0.5rem 0', color: 'var(--cf-orange)' }}>SE Team Sync</p>
            <p style={{ fontSize: '0.875rem', margin: '0.25rem 0' }}>📍 Tomorrow, 10:00 AM</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Monthly knowledge sharing</p>
          </div>
        </div>

        <div className="card">
          <h3>🚀 Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            <button>Upload Asset</button>
            <button style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '2px solid var(--border-color)' }}>
              Share Script
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
