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

export default function Events() {
  const { isAdmin } = useAdmin();
  const [filter, setFilter] = useState("upcoming");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'meeting',
    date: '',
    time: '',
    location: '',
    attendees: 0,
    description: '',
    icon: '📅',
    color: '#FF4E1B',
    targetGroups: ['all'] as string[]
  });

  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await api.events.getAll();
        setEvents(data);
      } catch (e) {
        console.error('Error loading events:', e);
      }
    };
    loadEvents();
  }, []);

  const deleteEvent = async (eventId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this event?');
    if (confirmed) {
      try {
        await api.events.delete(eventId);
        setEvents(prev => prev.filter(event => event.id !== eventId));
        alert('Event deleted successfully!');
      } catch (e) {
        console.error('Error deleting event:', e);
        alert('Failed to delete event');
      }
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newEvent = {
        ...formData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      await api.events.create(newEvent);
      setEvents(prev => [newEvent, ...prev]);
      setShowModal(false);
      setFormData({
        title: '',
        type: 'meeting',
        date: '',
        time: '',
        location: '',
        attendees: 0,
        description: '',
        icon: '📅',
        color: '#FF4E1B',
        targetGroups: ['all']
      });
      alert('Event created successfully!');
    } catch (e) {
      console.error('Error creating event:', e);
      alert('Failed to create event');
    }
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent) return;

    try {
      const updatedEvent = {
        ...currentEvent,
        ...formData,
      };
      await api.events.update(currentEvent.id, updatedEvent);
      setEvents(prev => prev.map(evt => evt.id === currentEvent.id ? updatedEvent : evt));
      setShowEditModal(false);
      setCurrentEvent(null);
      alert('Event updated successfully!');
    } catch (e) {
      console.error('Error updating event:', e);
      alert('Failed to update event');
    }
  };

  const openEditModal = (event: any) => {
    setCurrentEvent(event);
    setFormData({
      title: event.title,
      type: event.type,
      date: event.date,
      time: event.time,
      location: event.location,
      attendees: event.attendees,
      description: event.description,
      icon: event.icon,
      color: event.color,
      targetGroups: event.targetGroups || ['all']
    });
    setShowEditModal(true);
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
        {isAdmin && <button onClick={() => setShowModal(true)}>+ Create Event</button>}
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
                {event.createdAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                    <span>🕒</span>
                    <span>Posted {getRelativeTime(event.createdAt)}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button style={{ flex: 1, padding: '0.6rem', fontSize: '0.875rem' }}>
                  RSVP
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openEditModal(event);
                      }}
                      className="btn-secondary"
                      style={{
                        padding: '0.6rem 1rem',
                        fontSize: '0.875rem',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteEvent(event.id);
                      }}
                      type="button"
                      className="btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Event Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Event</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label htmlFor="title">Event Title *</label>
                <input
                  id="title"
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Event Type</label>
                <select
                  id="type"
                  className="form-select"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="meeting">Meeting</option>
                  <option value="conference">Conference</option>
                  <option value="demo">Demo</option>
                  <option value="workshop">Workshop</option>
                  <option value="social">Social</option>
                  <option value="planning">Planning</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="date">Date *</label>
                <input
                  id="date"
                  type="text"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  placeholder="e.g., Tomorrow, Jan 15, 2025"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="time">Time *</label>
                <input
                  id="time"
                  type="text"
                  className="form-input"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  placeholder="e.g., 10:00 AM - 11:00 AM"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">Location *</label>
                <input
                  id="location"
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., Zoom, Conference Room"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="attendees">Expected Attendees</label>
                <input
                  id="attendees"
                  type="number"
                  className="form-input"
                  value={formData.attendees}
                  onChange={(e) => setFormData({...formData, attendees: parseInt(e.target.value) || 0})}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  style={{resize: 'vertical'}}
                />
              </div>

              <div className="form-group">
                <label htmlFor="icon">Icon (emoji)</label>
                <input
                  id="icon"
                  type="text"
                  className="form-input"
                  value={formData.icon}
                  onChange={(e) => setFormData({...formData, icon: e.target.value})}
                  placeholder="📅"
                />
              </div>

              <GroupSelector
                selectedGroups={formData.targetGroups}
                onChange={(groups) => setFormData({...formData, targetGroups: groups})}
              />

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Event</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>

            <form onSubmit={handleEditEvent}>
              <div className="form-group">
                <label htmlFor="edit-title">Event Title *</label>
                <input
                  id="edit-title"
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-type">Event Type</label>
                <select
                  id="edit-type"
                  className="form-select"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="meeting">Meeting</option>
                  <option value="conference">Conference</option>
                  <option value="demo">Demo</option>
                  <option value="workshop">Workshop</option>
                  <option value="social">Social</option>
                  <option value="planning">Planning</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="edit-date">Date *</label>
                <input
                  id="edit-date"
                  type="text"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-time">Time *</label>
                <input
                  id="edit-time"
                  type="text"
                  className="form-input"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-location">Location *</label>
                <input
                  id="edit-location"
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-attendees">Expected Attendees</label>
                <input
                  id="edit-attendees"
                  type="number"
                  className="form-input"
                  value={formData.attendees}
                  onChange={(e) => setFormData({...formData, attendees: parseInt(e.target.value) || 0})}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  style={{resize: 'vertical'}}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-icon">Icon (emoji)</label>
                <input
                  id="edit-icon"
                  type="text"
                  className="form-input"
                  value={formData.icon}
                  onChange={(e) => setFormData({...formData, icon: e.target.value})}
                />
              </div>

              <GroupSelector
                selectedGroups={formData.targetGroups}
                onChange={(groups) => setFormData({...formData, targetGroups: groups})}
              />

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem', paddingBottom: '2rem' }}>
        Please report any bugs to Arun Potta
      </div>
    </div>
  );
}
