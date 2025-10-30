import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("assets", "routes/assets.tsx"),
  route("scripts", "routes/scripts.tsx"),
  route("events", "routes/events.tsx"),
  route("shoutouts", "routes/shoutouts.tsx"),
] satisfies RouteConfig;
