// ──────────────────────────────────────────────────────────────────────────────
// /events  +  /announcements  →  one tab, two views.
//
// Both routes resolve to this wrapper. The active section depends on the
// URL pathname (so /events lands on Events, /announcements on Announcements)
// and can be toggled with the segmented tab control. ?section=announcements
// is also honored for deep-linking from elsewhere in the app.
//
// We import the existing route components verbatim and render whichever one
// is active. They each manage their own state, modals, and headings, so this
// merge is purely a chrome change — no risk of regressing the existing
// events/announcements behavior.
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import EventsView from './events';
import AnnouncementsView from './announcements';
import './rfx.css';

type Section = 'events' | 'announcements';

export function meta() {
  return [
    { title: 'Events & News - SolutionHub' },
    { name: 'description', content: 'Team events calendar and announcements feed' },
  ];
}

export default function EventsAndNews() {
  const [section, setSection] = useState<Section>('events');

  // Pick the initial section from the URL: pathname > ?section= > default.
  // We re-read on history changes (popstate) so the bell + nav links can
  // navigate between the two without forcing a remount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('section') as Section | null;
      if (fromQuery === 'announcements' || fromQuery === 'events') {
        setSection(fromQuery);
        return;
      }
      if (path.startsWith('/announcements')) setSection('announcements');
      else setSection('events');
    };
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('pushstate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('pushstate', sync);
    };
  }, []);

  // Switching tabs updates both the local state and the URL (shallow), so
  // the address bar reflects the active section and bookmarks survive.
  const switchTo = (next: Section) => {
    setSection(next);
    if (typeof window === 'undefined') return;
    const path = next === 'events' ? '/events' : '/announcements';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      // Let any listeners (nav active state etc.) re-derive
      window.dispatchEvent(new Event('pushstate'));
    }
  };

  return (
    <div className="rfx-page" style={{ paddingBottom: 40 }}>
      {/* Hero */}
      <div className="rfx-header animate-in">
        <h2 className="rfx-title">Events &amp; News</h2>
        <p className="rfx-subtitle" style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
          Team events calendar and announcement feed in one place.
        </p>
      </div>

      {/* Two-tab segmented control */}
      <div className="rfx-tabs">
        <div className="rfx-tabs-grid">
          <button
            onClick={() => switchTo('events')}
            className={`rfx-btn rfx-btn--seg ${section === 'events' ? 'rfx-btn--seg-active' : ''}`}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Events
          </button>
          <button
            onClick={() => switchTo('announcements')}
            className={`rfx-btn rfx-btn--seg ${section === 'announcements' ? 'rfx-btn--seg-active' : ''}`}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            Announcements
          </button>
        </div>
      </div>

      {/* Active section. Each child manages its own header + state; we just
          conditionally mount the right one. Keeping them mounted-on-demand
          avoids running the announcements API call on the events tab and
          vice-versa. */}
      {section === 'events' ? <EventsView /> : <AnnouncementsView />}
    </div>
  );
}
