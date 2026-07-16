import { Navigate, useLocation } from "react-router";

export function meta() {
  return [
    { title: "Scripts - SolutionHub" },
    { name: "description", content: "Code snippets and automation scripts" },
  ];
}

// Scripts have been merged into the unified Assets tab. Redirect any existing
// /scripts links (bookmarks, ?action=share deep links, etc.) to /assets, where
// scripts now live alongside files and URLs in one list.
export default function ScriptsRedirect() {
  const location = useLocation();
  return <Navigate to={`/assets${location.search}`} replace />;
}
