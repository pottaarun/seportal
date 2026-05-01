import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Dashboard is the landing page (visiting / renders it). AI Hub lives
  // at /ai-hub so the URL clearly identifies the page.
  index("routes/_index.tsx"),
  route("ai-hub", "routes/ai-hub.tsx"),
  route("assets", "routes/assets.tsx"),
  route("scripts", "routes/scripts.tsx"),
  // Events + Announcements merged into a single tab with two view modes.
  // /events lands on the Events section, /announcements on Announcements;
  // both are aliases to the same wrapper so existing links keep working.
  route("events", "routes/events-and-news.tsx"),
  route("announcements", "routes/events-and-news.tsx", { id: "announcements-alias" }),
  route("shoutouts", "routes/shoutouts.tsx"),
  route("learning", "routes/learning.tsx"),
  route("competitions", "routes/competitions.tsx"),
  // Teams + Org Chart merged into a single page with three view modes
  // (Teams / Hierarchy / Map). /teams is kept as an alias so existing links
  // and bookmarks continue to work — needs an explicit route id since both
  // routes point at the same module.
  route("org-chart", "routes/org-chart.tsx"),
  route("teams", "routes/org-chart.tsx", { id: "teams-alias" }),
  route("rfx", "routes/rfx.tsx"),
  route("feature-requests", "routes/feature-requests.tsx"),
  route("skills-matrix", "routes/skills-matrix.tsx"),
  route("my-profile", "routes/my-profile.tsx"),
  // /my-team — group-admin + manager dashboard. The route is always
  // mounted, but the nav link in root.tsx is conditional on having
  // any reports/group-admin scope.
  route("my-team", "routes/my-team.tsx"),
  route("admin", "routes/admin.tsx"),
  // OAuth callback for cf-portal MCP (browser-side OAuth + PKCE, see lib/mcp.ts).
  // The redirect_uri registered with cf-portal points here.
  route("auth/mcp/callback", "routes/auth.mcp.callback.tsx"),
] satisfies RouteConfig;
