import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";

export function meta() {
  return [
    { title: "Competitions - SolutionHub" },
    { name: "description", content: "SE team competitions and challenges" },
  ];
}

export default function Competitions() {
  const { isAdmin, currentUserName } = useAdmin();
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [newCompetition, setNewCompetition] = useState({
    title: "",
    description: "",
    category: "sales",
    startDate: "",
    endDate: "",
    prize: "",
    status: "active",
    rules: ""
  });

  useEffect(() => {
    const loadCompetitions = async () => {
      try {
        const data = await api.competitions.getAll();
        setCompetitions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error loading competitions:', e);
        setCompetitions([]);
      }
    };
    loadCompetitions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCompetition) {
      // Update existing competition
      try {
        await api.competitions.update(editingCompetition.id, {
          ...newCompetition,
          startDate: newCompetition.startDate,
          endDate: newCompetition.endDate,
        });
        setCompetitions(prev => prev.map(comp =>
          comp.id === editingCompetition.id
            ? { ...comp, ...newCompetition, start_date: newCompetition.startDate, end_date: newCompetition.endDate }
            : comp
        ));
        alert('Competition updated successfully!');
      } catch (e) {
        console.error('Error updating competition:', e);
        alert('Failed to update competition');
      }
    } else {
      // Create new competition
      const competition = {
        id: `comp-${Date.now()}`,
        ...newCompetition,
        createdBy: currentUserName || 'Admin',
        participants: 0,
      };

      try {
        await api.competitions.create(competition);
        setCompetitions(prev => [...prev, {
          ...competition,
          start_date: competition.startDate,
          end_date: competition.endDate,
          created_by: competition.createdBy,
          created_at: new Date().toISOString(),
        }]);
        alert('Competition created successfully!');
      } catch (e) {
        console.error('Error creating competition:', e);
        alert('Failed to create competition');
      }
    }

    setShowModal(false);
    setEditingCompetition(null);
    setNewCompetition({
      title: "",
      description: "",
      category: "sales",
      startDate: "",
      endDate: "",
      prize: "",
      status: "active",
      rules: ""
    });
  };

  const handleEdit = (competition: any) => {
    setEditingCompetition(competition);
    setNewCompetition({
      title: competition.title,
      description: competition.description,
      category: competition.category,
      startDate: competition.start_date,
      endDate: competition.end_date,
      prize: competition.prize || "",
      status: competition.status,
      rules: competition.rules || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this competition?')) {
      try {
        await api.competitions.delete(id);
        setCompetitions(prev => prev.filter(comp => comp.id !== id));
        alert('Competition deleted successfully!');
      } catch (e) {
        console.error('Error deleting competition:', e);
        alert('Failed to delete competition');
      }
    }
  };

  const handleJoin = async (id: string) => {
    try {
      await api.competitions.join(id);
      setCompetitions(prev => prev.map(comp =>
        comp.id === id ? { ...comp, participants: comp.participants + 1 } : comp
      ));
      alert('You have joined the competition!');
    } catch (e) {
      console.error('Error joining competition:', e);
      alert('Failed to join competition');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      sales: '#10B981',
      technical: '#0051C3',
      'customer-success': '#F59E0B',
      'team-building': '#8B5CF6',
      other: '#6B7280'
    };
    return colors[category] || colors.other;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', label: '🟢 Active' },
      completed: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6B7280', label: '✅ Completed' },
      cancelled: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444', label: '❌ Cancelled' }
    };
    return config[status] || config.active;
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Ended';
    if (diff === 0) return 'Ends today';
    if (diff === 1) return '1 day left';
    return `${diff} days left`;
  };

  const filteredCompetitions = competitions.filter(comp => {
    if (filter === 'all') return true;
    return comp.status === filter;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>SE Competitions</h2>
          <p>Compete, win prizes, and celebrate success together</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditingCompetition(null); setShowModal(true); }}>
            + Create Competition
          </button>
        )}
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => setFilter('active')}
          style={{
            background: filter === 'active' ? 'var(--cf-orange)' : 'var(--bg-tertiary)',
            color: filter === 'active' ? 'white' : 'var(--text-primary)',
            border: filter === 'active' ? 'none' : '2px solid var(--border-color)'
          }}
        >
          Active ({competitions.filter(c => c.status === 'active').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          style={{
            background: filter === 'completed' ? 'var(--cf-orange)' : 'var(--bg-tertiary)',
            color: filter === 'completed' ? 'white' : 'var(--text-primary)',
            border: filter === 'completed' ? 'none' : '2px solid var(--border-color)'
          }}
        >
          Completed ({competitions.filter(c => c.status === 'completed').length})
        </button>
        <button
          onClick={() => setFilter('all')}
          style={{
            background: filter === 'all' ? 'var(--cf-orange)' : 'var(--bg-tertiary)',
            color: filter === 'all' ? 'white' : 'var(--text-primary)',
            border: filter === 'all' ? 'none' : '2px solid var(--border-color)'
          }}
        >
          All ({competitions.length})
        </button>
      </div>

      <div className="grid">
        {filteredCompetitions.length === 0 ? (
          <div className="card">
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              {filter === 'active' ? 'No active competitions yet' : `No ${filter} competitions`}
            </p>
          </div>
        ) : (
          filteredCompetitions.map((competition) => {
            const statusBadge = getStatusBadge(competition.status);
            const daysLeft = getDaysRemaining(competition.end_date);
            const categoryColor = getCategoryColor(competition.category);

            return (
              <div key={competition.id} className="card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: statusBadge.bg,
                          color: statusBadge.text
                        }}
                      >
                        {statusBadge.label}
                      </span>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: `${categoryColor}15`,
                          color: categoryColor,
                          textTransform: 'capitalize'
                        }}
                      >
                        {competition.category.replace('-', ' ')}
                      </span>
                    </div>
                    <h3 style={{ margin: '0.5rem 0' }}>{competition.title}</h3>
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEdit(competition)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(competition.id)}
                        className="btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {competition.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Start Date</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{competition.start_date}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>End Date</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                      {competition.end_date}
                      {competition.status === 'active' && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--cf-orange)', fontSize: '0.75rem' }}>
                          ({daysLeft})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {competition.prize && (
                  <div
                    style={{
                      padding: '0.75rem',
                      background: 'linear-gradient(135deg, #F59E0B15 0%, #F59E0B05 100%)',
                      borderRadius: '8px',
                      borderLeft: '3px solid #F59E0B',
                      marginBottom: '1rem'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: '600', marginBottom: '0.25rem' }}>
                      🏆 Prize
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{competition.prize}</div>
                  </div>
                )}

                {competition.rules && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Rules</div>
                    <div style={{ fontSize: '0.875rem' }}>{competition.rules}</div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    👥 {competition.participants} participant{competition.participants !== 1 ? 's' : ''}
                  </div>
                  {competition.status === 'active' && !isAdmin && (
                    <button
                      onClick={() => handleJoin(competition.id)}
                      style={{ padding: '6px 16px', fontSize: '14px' }}
                    >
                      Join Competition
                    </button>
                  )}
                  {competition.winner && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--cf-orange)', fontWeight: '600' }}>
                      🏆 Winner: {competition.winner}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingCompetition(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingCompetition ? 'Edit Competition' : 'Create New Competition'}</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditingCompetition(null); }}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Competition Title *</label>
                <input
                  id="title"
                  type="text"
                  className="form-input"
                  value={newCompetition.title}
                  onChange={(e) => setNewCompetition({ ...newCompetition, title: e.target.value })}
                  placeholder="Top Sales Quarter Challenge"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  className="form-input"
                  value={newCompetition.description}
                  onChange={(e) => setNewCompetition({ ...newCompetition, description: e.target.value })}
                  placeholder="Describe the competition objectives and goals..."
                  rows={3}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    className="form-input"
                    value={newCompetition.category}
                    onChange={(e) => setNewCompetition({ ...newCompetition, category: e.target.value })}
                    required
                  >
                    <option value="sales">Sales</option>
                    <option value="technical">Technical</option>
                    <option value="customer-success">Customer Success</option>
                    <option value="team-building">Team Building</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="status">Status *</label>
                  <select
                    id="status"
                    className="form-input"
                    value={newCompetition.status}
                    onChange={(e) => setNewCompetition({ ...newCompetition, status: e.target.value })}
                    required
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="startDate">Start Date *</label>
                  <input
                    id="startDate"
                    type="date"
                    className="form-input"
                    value={newCompetition.startDate}
                    onChange={(e) => setNewCompetition({ ...newCompetition, startDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endDate">End Date *</label>
                  <input
                    id="endDate"
                    type="date"
                    className="form-input"
                    value={newCompetition.endDate}
                    onChange={(e) => setNewCompetition({ ...newCompetition, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="prize">Prize / Reward</label>
                <input
                  id="prize"
                  type="text"
                  className="form-input"
                  value={newCompetition.prize}
                  onChange={(e) => setNewCompetition({ ...newCompetition, prize: e.target.value })}
                  placeholder="$500 bonus, Team dinner, 3 days PTO..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="rules">Rules / Requirements</label>
                <textarea
                  id="rules"
                  className="form-input"
                  value={newCompetition.rules}
                  onChange={(e) => setNewCompetition({ ...newCompetition, rules: e.target.value })}
                  placeholder="Competition rules, eligibility, and requirements..."
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); setEditingCompetition(null); }}>
                  Cancel
                </button>
                <button type="submit">
                  {editingCompetition ? 'Update Competition' : 'Create Competition'}
                </button>
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
