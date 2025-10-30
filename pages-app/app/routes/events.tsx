import { useState } from "react";
import { useAdmin } from "../contexts/AdminContext";

export function meta() {
  return [
    { title: "Events - SE Portal" },
    { name: "description", content: "Team events and calendar" },
  ];
}

export default function Events() {
  const { isAdmin } = useAdmin();
  const [filter, setFilter] = useState("upcoming");

  const [events, setEvents] = useState([
    {
      id: '1',
      title: 'SE Team Sync',
      type: 'meeting',
      date: 'Tomorrow',
      time: '10:00 AM - 11:00 AM',
      location: 'Zoom',
      attendees: 12,
      description: 'Monthly knowledge sharing and team updates',
      icon: '👥',
      color: 'var(--cf-orange)'
    },
    {
      id: '2',
      title: 'Cloudflare Connect 2025',
      type: 'conference',
      date: 'Mar 15, 2025',
      time: 'All Day',
      location: 'San Francisco, CA',
      attendees: 248,
      description: 'Annual Cloudflare customer and partner conference',
      icon: '🎪',
      color: 'var(--cf-blue)'
    },
    {
      id: '3',
      title: 'Demo Friday',
      type: 'demo',
      date: 'This Friday',
      time: '2:00 PM - 3:00 PM',
      location: 'Main Conference Room',
      attendees: 8,
      description: 'Weekly demo session - show off your wins!',
      icon: '🎬',
      color: 'var(--success)'
    },
    {
      id: '4',
      title: 'API Workshop',
      type: 'workshop',
      date: 'Next Week',
      time: '1:00 PM - 4:00 PM',
      location: 'Training Room',
      attendees: 15,
      description: 'Hands-on Cloudflare API integration workshop',
      icon: '🛠️',
      color: '#8B5CF6'
    },
    {
      id: '5',
      title: 'Team Happy Hour',
      type: 'social',
      date: 'Next Friday',
      time: '5:00 PM',
      location: 'The Orange Room',
      attendees: 22,
      description: 'Unwind and celebrate the week!',
      icon: '🍻',
      color: '#F59E0B'
    },
    {
      id: '6',
      title: 'Q1 Planning Session',
      type: 'planning',
      date: 'Jan 10, 2025',
      time: '9:00 AM - 12:00 PM',
      location: 'Executive Conference Room',
      attendees: 6,
      description: 'Strategic planning for Q1 objectives',
      icon: '📊',
      color: '#EF4444'
    },
  ]);

  const deleteEvent = (eventId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this event?');
    if (confirmed) {
      setEvents(prev => prev.filter(event => event.id !== eventId));
      alert('Event deleted successfully!');
    }
  };

  const upcomingEvents = events.filter((_, i) => i < 4);
  const allEvents = events;

  const displayEvents = filter === "upcoming" ? upcomingEvents : allEvents;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>📅 Events Calendar</h2>
          <p>Upcoming team events, meetings, and activities</p>
        </div>
        <button>+ Create Event</button>
      </div>

      <div className="filter-buttons">
        <button className={`filter-btn ${filter === "upcoming" ? "active" : ""}`} onClick={() => setFilter("upcoming")}>
          Upcoming
        </button>
        <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          All Events
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {displayEvents.map((event, index) => (
          <div
            key={event.id}
            className="card animate-in"
            style={{
              animationDelay: `${index * 0.05}s`,
              borderLeft: `4px solid ${event.color}`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              fontSize: '5rem',
              opacity: 0.05,
              pointerEvents: 'none'
            }}>
              {event.icon}
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  fontSize: '2rem',
                  lineHeight: 1,
                  background: `${event.color}20`,
                  color: event.color,
                  borderRadius: '10px',
                  padding: '0.65rem',
                }}>
                  {event.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>{event.title}</h3>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    textTransform: 'capitalize'
                  }}>
                    {event.type}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <p style={{ margin: '0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {event.description}
                </p>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                padding: '1rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span>📅</span>
                  <span style={{ fontWeight: '600' }}>{event.date}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span>🕐</span>
                  <span>{event.time}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span>📍</span>
                  <span>{event.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span>👥</span>
                  <span>{event.attendees} attending</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button style={{ flex: 1, padding: '0.6rem', fontSize: '0.875rem' }}>
                  RSVP
                </button>
                <button style={{
                  padding: '0.6rem 1rem',
                  fontSize: '0.875rem',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border-color)'
                }}>
                  Details
                </button>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteEvent(event.id);
                    }}
                    type="button"
                    style={{
                      padding: '0.6rem 1rem',
                      fontSize: '0.875rem',
                      background: 'var(--error)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '980px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
