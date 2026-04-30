import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // AI Hub is the default landing page (the AI skills library users land on
  // when visiting /). The previous dashboard moved to /dashboard. We also
  // keep /ai-hub as an alias so existing links/bookmarks keep working —
  // React Router needs an explicit id since the file is reused.
  index("routes/ai-hub.tsx"),
  route("dashboard", "routes/_index.tsx"),
  route("ai-hub", "routes/ai-hub.tsx", { id: "ai-hub-alias" }),
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
  route("feature-requests", "routes/feature-requests.tsx"),
  route("skills-matrix", "routes/skills-matrix.tsx"),
  route("my-profile", "routes/my-profile.tsx"),
  route("admin", "routes/admin.tsx"),
] satisfies RouteConfig;
