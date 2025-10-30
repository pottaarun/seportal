export function meta() {
  return [
    { title: "Analytics - SE Portal" },
    { name: "description", content: "View usage analytics and metrics" },
  ];
}

export default function Analytics() {
  // Mock data for SPA mode
  const stats = {
    total_events: 1543,
    unique_users: 287,
    period: 'Last 24 hours',
  };

  return (
    <div>
      <h2>Analytics</h2>
      <p>Real-time metrics and performance insights powered by Cloudflare Analytics</p>

      <div className="analytics-grid">
        <div className="metric-card">
          <h3>Total Events</h3>
          <div className="metric-value">{stats.total_events.toLocaleString()}</div>
          <p className="metric-period">{stats.period}</p>
        </div>

        <div className="metric-card">
          <h3>Unique Users</h3>
          <div className="metric-value">{stats.unique_users.toLocaleString()}</div>
          <p className="metric-period">{stats.period}</p>
        </div>

        <div className="metric-card">
          <h3>Avg per User</h3>
          <div className="metric-value">
            {(stats.total_events / stats.unique_users).toFixed(1)}
          </div>
          <p className="metric-period">Events per user</p>
        </div>

        <div className="metric-card">
          <h3>Response Time</h3>
          <div className="metric-value">23ms</div>
          <p className="metric-period">Average latency</p>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Performance Breakdown</h3>
        <div className="dashboard-grid">
          <div className="card">
            <h3>Cache Hit Rate</h3>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)', margin: '0.5rem 0' }}>
              94.2%
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--cf-gray-500)' }}>
              Optimized by Cloudflare CDN
            </p>
          </div>

          <div className="card">
            <h3>Bandwidth Saved</h3>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--cf-orange)', margin: '0.5rem 0' }}>
              2.4 TB
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--cf-gray-500)' }}>
              This month
            </p>
          </div>

          <div className="card">
            <h3>Threats Blocked</h3>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--error)', margin: '0.5rem 0' }}>
              1,247
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--cf-gray-500)' }}>
              Security events mitigated
            </p>
          </div>
        </div>
      </div>

      <div className="chart-placeholder" style={{ marginTop: '2rem' }}>
        <h3 style={{ color: 'var(--cf-gray-600)', marginBottom: '1rem' }}>Traffic Insights</h3>
        <p>Interactive charts and visualizations coming soon</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--cf-gray-400)', marginTop: '0.5rem' }}>
          Integrate with Cloudflare Analytics Engine for real-time data
        </p>
      </div>
    </div>
  );
}
