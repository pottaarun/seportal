import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";
import { GroupSelector } from "../components/GroupSelector";
import { getRelativeTime } from "../lib/timeUtils";

export function meta() {
  return [
    { title: "Announcements - SE Portal" },
    { name: "description", content: "Team announcements and important updates" },
  ];
}

export default function Announcements() {
  const { isAdmin } = useAdmin();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    message: "",
    priority: "normal",
    targetGroups: ['all'] as string[]
  });

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const data = await api.announcements.getAll();
        setAnnouncements(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error loading announcements:', e);
        setAnnouncements([]);
      }
    };
    loadAnnouncements();
  }, []);

  const deleteAnnouncement = async (announcementId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this announcement?');
    if (confirmed) {
      try {
        await api.announcements.delete(announcementId);
        setAnnouncements(prev => prev.filter(announcement => announcement.id !== announcementId));
        alert('Announcement deleted successfully!');
      } catch (e) {
        console.error('Error deleting announcement:', e);
        alert('Failed to delete announcement');
      }
    }
  };

  const priorityConfig = {
    urgent: {
      color: '#EF4444',
      icon: '🚨',
      label: 'Urgent',
      bg: 'rgba(239, 68, 68, 0.1)'
    },
    high: {
      color: '#F59E0B',
      icon: '⚠️',
      label: 'High Priority',
      bg: 'rgba(245, 158, 11, 0.1)'
    },
    normal: {
      color: 'var(--cf-blue)',
      icon: '📢',
      label: 'Normal',
      bg: 'rgba(0, 81, 195, 0.1)'
    },
    low: {
      color: '#6B7280',
      icon: 'ℹ️',
      label: 'FYI',
      bg: 'rgba(107, 114, 128, 0.1)'
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>📢 Announcements</h2>
          <p>Important updates and team communications</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)}>+ New Announcement</button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
        {announcements.map((announcement, index) => {
          const config = priorityConfig[announcement.priority as keyof typeof priorityConfig] || priorityConfig.normal;

          return (
            <div
              key={announcement.id}
              className="card animate-in"
              style={{
                animationDelay: `${index * 0.05}s`,
                borderLeft: `4px solid ${config.color}`,
                background: `linear-gradient(135deg, ${config.bg} 0%, var(--bg-secondary) 50%)`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{config.icon}</span>
                    <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{announcement.title}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: config.bg,
                      color: config.color,
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {config.label}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                      📅 {announcement.createdAt ? getRelativeTime(announcement.createdAt) : announcement.date}
                    </span>
                    {announcement.author && (
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                        👤 {announcement.author}
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteAnnouncement(announcement.id)}
                    className="btn-danger btn-sm"
                  >
                    Delete
                  </button>
                )}
              </div>

              <p style={{
                margin: '1.5rem 0 0 0',
                fontSize: '1rem',
                lineHeight: 1.7,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap'
              }}>
                {announcement.message}
              </p>

              {announcement.targetGroups && announcement.targetGroups.length > 0 &&
               !announcement.targetGroups.includes('all') && (
                <div style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-color)',
                  fontSize: '0.875rem',
                  color: 'var(--text-tertiary)'
                }}>
                  🎯 Targeted to: {announcement.targetGroups.join(', ')}
                </div>
              )}
            </div>
          );
        })}

        {announcements.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📢</div>
            <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No announcements yet</p>
            <p style={{ fontSize: '0.875rem' }}>
              {isAdmin
                ? 'Create your first announcement to share important updates with the team'
                : 'Check back later for team updates and announcements'}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>📢 New Announcement</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();

              const currentUser = localStorage.getItem('seportal_user_name') || 'Admin';

              const announcementData = {
                id: Date.now().toString(),
                title: newAnnouncement.title,
                message: newAnnouncement.message,
                priority: newAnnouncement.priority,
                author: currentUser,
                date: new Date().toLocaleDateString(),
                targetGroups: newAnnouncement.targetGroups,
                createdAt: new Date().toISOString()
              };

              try {
                await api.announcements.create(announcementData);
                setAnnouncements(prev => [announcementData, ...prev]);
                setShowModal(false);
                setNewAnnouncement({
                  title: "",
                  message: "",
                  priority: "normal",
                  targetGroups: ['all']
                });
                alert('Announcement created successfully!');
              } catch (error) {
                console.error('Error creating announcement:', error);
                alert('Failed to create announcement');
              }
            }}>
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  id="title"
                  type="text"
                  className="form-input"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  placeholder="e.g., Q4 Goals Meeting Tomorrow"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select
                  id="priority"
                  className="form-select"
                  value={newAnnouncement.priority}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value })}
                >
                  <option value="low">ℹ️ FYI - Low Priority</option>
                  <option value="normal">📢 Normal</option>
                  <option value="high">⚠️ High Priority</option>
                  <option value="urgent">🚨 Urgent</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  className="form-input"
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                  placeholder="Share important information with the team..."
                  rows={6}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <GroupSelector
                selectedGroups={newAnnouncement.targetGroups}
                onChange={(groups) => setNewAnnouncement({ ...newAnnouncement, targetGroups: groups })}
              />

              <div className="modal-actions">
                <button type="submit">Create Announcement</button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
