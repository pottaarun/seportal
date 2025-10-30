import type { Route } from "./+types/analytics";

export async function loader({ context }: Route.LoaderArgs) {
  // Access Cloudflare bindings
  // const { DB, KV } = context.cloudflare.env;

  // Example: Fetch analytics from KV or D1
  // const stats = await KV.get('stats:hourly', 'json');

  // Mock data for now
  const stats = {
    total_events: 1543,
    unique_users: 287,
    period: 'Last 24 hours',
  };

  return { stats };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Analytics - SE Portal" },
    { name: "description", content: "View usage analytics and metrics" },
  ];
}

export default function Analytics({ loaderData }: Route.ComponentProps) {
  const { stats } = loaderData;

  return (
    <div>
      <h2>Analytics</h2>
      <p>Track usage metrics and performance</p>

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
      </div>

      <div className="chart-placeholder">
        <p>Charts and graphs will appear here</p>
      </div>
    </div>
  );
}
