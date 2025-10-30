import { useState } from "react";
import { useAdmin } from "../contexts/AdminContext";

export function meta() {
  return [
    { title: "Shoutouts - SE Portal" },
    { name: "description", content: "Team recognition and celebrations" },
  ];
}

export default function Shoutouts() {
  const { isAdmin } = useAdmin();
  const [showModal, setShowModal] = useState(false);
  const [newShoutout, setNewShoutout] = useState({ to: "", message: "", category: "achievement" });

  const [shoutouts, setShoutouts] = useState([
    {
      id: '1',
      from: 'Mike Chen',
      to: 'Sarah Park',
      message: 'Absolutely crushed the customer demo today! The technical deep-dive was perfect and we closed the deal. Amazing work! 🎉',
      category: 'achievement',
      likes: 24,
      date: '2 hours ago',
      icon: '🏆'
    },
    {
      id: '2',
      from: 'Alex Kumar',
      to: 'Jordan Lee',
      message: 'Your new automation script saved our team 10+ hours this week. You\'re a lifesaver! Thank you! 🙏',
      category: 'helpful',
      likes: 18,
      date: '5 hours ago',
      icon: '💪'
    },
    {
      id: '3',
      from: 'Sarah Park',
      to: 'Team',
      message: 'Shoutout to everyone who participated in the Q4 planning! Great energy and ideas all around. Let\'s crush these goals! 🚀',
      category: 'teamwork',
      likes: 31,
      date: 'Yesterday',
      icon: '🤝'
    },
    {
      id: '4',
      from: 'Jordan Lee',
      to: 'Mike Chen',
      message: 'Mike always goes above and beyond to help teammates. Your mentorship on the API integration was invaluable! 🌟',
      category: 'mentorship',
      likes: 22,
      date: 'Yesterday',
      icon: '👨‍🏫'
    },
    {
      id: '5',
      from: 'Emily Rodriguez',
      to: 'Alex Kumar',
      message: 'Your presentation at the all-hands was inspiring! Love the creative approach to solving that challenge. 💡',
      category: 'innovation',
      likes: 27,
      date: '2 days ago',
      icon: '💡'
    },
    {
      id: '6',
      from: 'Chris Taylor',
      to: 'Sarah Park',
      message: 'Sarah pulled an all-nighter to help fix the production issue. True dedication to the team and customers! 🔥',
      category: 'dedication',
      likes: 35,
      date: '3 days ago',
      icon: '🔥'
    },
  ]);

  const deleteShoutout = (shoutoutId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this shoutout?');
    if (confirmed) {
      setShoutouts(prev => prev.filter(shoutout => shoutout.id !== shoutoutId));
      alert('Shoutout deleted successfully!');
    }
  };

  const categoryColors = {
    achievement: 'var(--cf-orange)',
    helpful: 'var(--success)',
    teamwork: 'var(--cf-blue)',
    mentorship: '#8B5CF6',
    innovation: '#F59E0B',
    dedication: '#EF4444',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>🎉 Team Shoutouts</h2>
          <p>Recognize and celebrate your teammates' awesome work</p>
        </div>
        <button onClick={() => setShowModal(true)}>+ Give Shoutout</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {shoutouts.map((shoutout, index) => (
          <div
            key={shoutout.id}
            className="card animate-in"
            style={{
              animationDelay: `${index * 0.05}s`,
              background: `linear-gradient(135deg, ${categoryColors[shoutout.category]}15 0%, var(--bg-secondary) 50%)`,
              borderLeft: `4px solid ${categoryColors[shoutout.category]}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                fontSize: '2.5rem',
                lineHeight: 1,
                background: `${categoryColors[shoutout.category]}20`,
                borderRadius: '12px',
                padding: '0.75rem',
              }}>
                {shoutout.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{shoutout.from}</strong> → <strong style={{ color: 'var(--text-primary)' }}>{shoutout.to}</strong>
                    </p>
                  </div>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    background: `${categoryColors[shoutout.category]}20`,
                    color: categoryColors[shoutout.category],
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap'
                  }}>
                    {shoutout.category}
                  </span>
                </div>
              </div>
            </div>

            <p style={{
              margin: '1rem 0',
              fontSize: '1rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              fontStyle: 'italic'
            }}>
              "{shoutout.message}"
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-color)',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <button style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                background: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: 'none'
              }}>
                ❤️ {shoutout.likes}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>{shoutout.date}</span>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteShoutout(shoutout.id);
                    }}
                    type="button"
                    style={{
                      padding: '0.5rem 1rem',
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎉 Give a Shoutout</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              setShowModal(false);
              setNewShoutout({ to: "", message: "", category: "achievement" });
            }}>
              <div className="form-group">
                <label htmlFor="to">Who deserves recognition? *</label>
                <input
                  id="to"
                  type="text"
                  className="form-input"
                  value={newShoutout.to}
                  onChange={(e) => setNewShoutout({ ...newShoutout, to: e.target.value })}
                  placeholder="Team member name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  className="form-select"
                  value={newShoutout.category}
                  onChange={(e) => setNewShoutout({ ...newShoutout, category: e.target.value })}
                >
                  <option value="achievement">🏆 Achievement</option>
                  <option value="helpful">💪 Helpful</option>
                  <option value="teamwork">🤝 Teamwork</option>
                  <option value="mentorship">👨‍🏫 Mentorship</option>
                  <option value="innovation">💡 Innovation</option>
                  <option value="dedication">🔥 Dedication</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="message">Your message *</label>
                <textarea
                  id="message"
                  className="form-input"
                  value={newShoutout.message}
                  onChange={(e) => setNewShoutout({ ...newShoutout, message: e.target.value })}
                  placeholder="Share why they're awesome..."
                  rows={4}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit">Send Shoutout 🎉</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
