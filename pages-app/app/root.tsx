import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <div className="app-container">
      <nav className="main-nav">
        <h1>SE Portal</h1>
        <ul>
          <li><a href="/">Dashboard</a></li>
          <li><a href="/customers">Customers</a></li>
          <li><a href="/analytics">Analytics</a></li>
        </ul>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
