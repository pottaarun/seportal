import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";
import { GroupSelector } from "../components/GroupSelector";
import { getRelativeTime } from "../lib/timeUtils";

export function meta() {
  return [
    { title: "Events - SolutionHub" },
    { name: "description", content: "Team events and calendar" },
  ];
}

function EventForm({ formData, setFormData, onSubmit, onCancel, submitLabel }: {
  formData: any; setFormData: (d: any) => void; onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void; submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="ev-title">Event Title</label>
        <input id="ev-title" type="text" className="form-input" value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label htmlFor="ev-type">Event Type</label>
          <select id="ev-type" className="form-select" value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
            <option value="meeting">Meeting</option><option value="conference">Conference</option>
            <option value="demo">Demo</option><option value="workshop">Workshop</option>
            <option value="social">Social</option><option value="planning">Planning</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="ev-attendees">Attendees</label>
          <input id="ev-attendees" type="number" className="form-input" value={formData.attendees}
            onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) || 0 })} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label htmlFor="ev-date">Date</label>
          <input id="ev-date" type="text" className="form-input" value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })} placeholder="e.g., Jan 15, 2025" required />
        </div>
        <div className="form-group">
          <label htmlFor="ev-time">Time</label>
          <input id="ev-time" type="text" className="form-input" value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })} placeholder="e.g., 10:00 AM" required />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="ev-location">Location</label>
        <input id="ev-location" type="text" className="form-input" value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Zoom, Conference Room" required />
      </div>
      <div className="form-group">
        <label htmlFor="ev-desc">Description</label>
        <textarea id="ev-desc" className="form-input" value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
      </div>
      <div className="form-group">
        <label htmlFor="ev-icon">Icon (emoji)</label>
        <input id="ev-icon" type="text" className="form-input" value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="e.g. calendar emoji" />
      </div>
      <GroupSelector selectedGroups={formData.targetGroups} onChange={(groups) => setFormData({ ...formData, targetGroups: groups })} />
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}

export default function Events() {
  const { isAdmin } = useAdmin();
  const [filter, setFilter] = useState("upcoming");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '', type: 'meeting', date: '', time: '', location: '',
    attendees: 0, description: '', icon: '\u{1F4C5}', color: '#FF4E1B', targetGroups: ['all'] as string[]
  });
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      try { setEvents(await api.events.getAll()); }
      catch (e) { console.error('Error loading events:', e); }
    };
    loadEvents();
  }, []);

  const deleteEvent = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try { await api.events.delete(eventId); setEvents(prev => prev.filter(e => e.id !== eventId)); }
      catch (e) { console.error('Error deleting event:', e); alert('Failed to delete event'); }
    }
  };

  const resetForm = () => setFormData({
    title: '', type: 'meeting', date: '', time: '', location: '',
    attendees: 0, description: '', icon: '\u{1F4C5}', color: '#FF4E1B', targetGroups: ['all']
  });

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newEvent = { ...formData, id: Date.now().toString(), createdAt: new Date().toISOString() };
      await api.events.create(newEvent);
      setEvents(prev => [newEvent, ...prev]);
      setShowModal(false);
      resetForm();
    } catch (e) { console.error('Error creating event:', e); alert('Failed to create event'); }
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent) return;
    try {
      const updated = { ...currentEvent, ...formData };
      await api.events.update(currentEvent.id, updated);
      setEvents(prev => prev.map(evt => evt.id === currentEvent.id ? updated : evt));
      setShowEditModal(false);
      setCurrentEvent(null);
    } catch (e) { console.error('Error updating event:', e); alert('Failed to update event'); }
  };

  const openEditModal = (event: any) => {
    setCurrentEvent(event);
    setFormData({
      title: event.title, type: event.type, date: event.date, time: event.time,
      location: event.location, attendees: event.attendees, description: event.description,
      icon: event.icon, color: event.color, targetGroups: event.targetGroups || ['all']
    });
    setShowEditModal(true);
  };

  const displayEvents = filter === "upcoming" ? events.slice(0, 4) : events;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Events Calendar</h2>
          <p className="page-subtitle">Upcoming team events, meetings, and activities</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
            Create Event
          </button>
        )}
      </div>

      <div className="filter-buttons">
        <button className={`filter-btn ${filter === "upcoming" ? "active" : ""}`} onClick={() => setFilter("upcoming")}>Upcoming</button>
        <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All Events</button>
      </div>

      <div className="content-grid">
        {displayEvents.map((event, index) => (
          <div key={event.id} className="card animate-in" style={{
            animationDelay: `${index * 0.05}s`,
            borderLeft: `3px solid ${event.color || 'var(--cf-orange)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '14px', marginBottom: '14px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                background: `${event.color || 'var(--cf-orange)'}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0,
              }}>
                {event.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontFamily: "'DM Serif Display', serif" }}>{event.title}</h3>
                <span className="badge badge-gray" style={{ fontSize: '10px', textTransform: 'capitalize' }}>{event.type}</span>
              </div>
            </div>

            {event.description && (
              <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, maxWidth: 'none' }}>
                {event.description}
              </p>
            )}

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
              padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '14px',
              fontSize: '13px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <span style={{ fontWeight: 600 }}>{event.date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <span>{event.time}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span>{event.location}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                <span>{event.attendees} attending</span>
              </div>
              {event.createdAt && (
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  Posted {getRelativeTime(event.createdAt)}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button style={{ flex: 1 }} className="btn-sm">RSVP</button>
              {isAdmin && (
                <>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(event); }} className="btn-secondary btn-sm">Edit</button>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteEvent(event.id); }} type="button" className="btn-danger btn-sm">Delete</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {displayEvents.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <p className="empty-state-text">No events scheduled</p>
          <p className="empty-state-sub">{isAdmin ? 'Create a new event' : 'Check back later'}</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Event</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&#215;</button>
            </div>
            <EventForm formData={formData} setFormData={setFormData} onSubmit={handleCreateEvent}
              onCancel={() => setShowModal(false)} submitLabel="Create Event" />
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Event</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>&#215;</button>
            </div>
            <EventForm formData={formData} setFormData={setFormData} onSubmit={handleEditEvent}
              onCancel={() => setShowEditModal(false)} submitLabel="Save Changes" />
          </div>
        </div>
      )}

      <div className="page-footer">SolutionHub by Cloudflare SE Team</div>
    </div>
  );
}
