import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "SE Portal - Dashboard" },
    { name: "description", content: "Solution Engineering Portal Dashboard" },
  ];
}

export default function Index() {
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome to the Solution Engineering Portal</p>
      <div className="dashboard-grid">
        <div className="card">
          <h3>Quick Stats</h3>
          <p>Your overview will appear here</p>
        </div>
        <div className="card">
          <h3>Recent Activity</h3>
          <p>Latest updates will show here</p>
        </div>
      </div>
    </div>
  );
}
