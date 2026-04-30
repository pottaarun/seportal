import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("assets", "routes/assets.tsx"),
  route("scripts", "routes/scripts.tsx"),
  route("events", "routes/events.tsx"),
  route("announcements", "routes/announcements.tsx"),
  route("shoutouts", "routes/shoutouts.tsx"),
  route("learning", "routes/learning.tsx"),
  route("competitions", "routes/competitions.tsx"),
  route("org-chart", "routes/org-chart.tsx"),
  route("teams", "routes/teams.tsx"),
  route("rfx", "routes/rfx.tsx"),
  route("ai-hub", "routes/ai-hub.tsx"),
  route("feature-requests", "routes/feature-requests.tsx"),
  route("skills-matrix", "routes/skills-matrix.tsx"),
  route("my-profile", "routes/my-profile.tsx"),
  route("admin", "routes/admin.tsx"),
] satisfies RouteConfig;
