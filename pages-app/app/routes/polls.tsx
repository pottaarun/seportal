import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";
import { GroupSelector } from "../components/GroupSelector";

export function meta() {
  return [
    { title: "Polls - SE Portal" },
    { name: "description", content: "Create and vote on team polls" },
  ];
}

export default function Voting() {
  const { isAdmin } = useAdmin();
  const [polls, setPolls] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newPoll, setNewPoll] = useState({
    question: "",
    options: ["", ""],
    category: "general",
    targetGroups: ['all'] as string[]
  });
  const [votedPolls, setVotedPolls] = useState<Set<string>>(() => {
    // Load voted polls from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seportal_voted_polls');
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch (e) {
          return new Set();
        }
      }
    }
    return new Set();
  });

  useEffect(() => {
    const loadPolls = async () => {
      try {
        const data = await api.polls.getAll();
        setPolls(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error loading polls:', e);
        setPolls([]);
      }
    };
    loadPolls();
  }, []);

  // Save voted polls to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('seportal_voted_polls', JSON.stringify(Array.from(votedPolls)));
    }
  }, [votedPolls]);

  const deletePoll = async (pollId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this poll?');
    if (confirmed) {
      try {
        await api.polls.delete(pollId);
        setPolls(prev => prev.filter(poll => poll.id !== pollId));
        alert('Poll deleted successfully!');
      } catch (e) {
        console.error('Error deleting poll:', e);
        alert('Failed to delete poll');
      }
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (votedPolls.has(pollId)) {
      alert('You have already voted on this poll!');
      return;
    }

    // Optimistic update
    setPolls(prev => prev.map(poll => {
      if (poll.id === pollId) {
        const newOptions = poll.options.map((opt: any, idx: number) => ({
          ...opt,
          votes: idx === optionIndex ? opt.votes + 1 : opt.votes
        }));
        return { ...poll, options: newOptions, totalVotes: poll.totalVotes + 1 };
      }
      return poll;
    }));

    setVotedPolls(new Set(votedPolls).add(pollId));

    try {
      await api.polls.vote(pollId, optionIndex);
    } catch (e) {
      console.error('Error voting:', e);
      // Revert on error
      setPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          const newOptions = poll.options.map((opt: any, idx: number) => ({
            ...opt,
            votes: idx === optionIndex ? opt.votes - 1 : opt.votes
          }));
          return { ...poll, options: newOptions, totalVotes: poll.totalVotes - 1 };
        }
        return poll;
      }));
      setVotedPolls(prev => {
        const newSet = new Set(prev);
        newSet.delete(pollId);
        return newSet;
      });
    }
  };

  const addOption = () => {
    if (newPoll.options.length < 6) {
      setNewPoll({ ...newPoll, options: [...newPoll.options, ""] });
    }
  };

  const removeOption = (index: number) => {
    if (newPoll.options.length > 2) {
      setNewPoll({
        ...newPoll,
        options: newPoll.options.filter((_, i) => i !== index)
      });
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...newPoll.options];
    newOptions[index] = value;
    setNewPoll({ ...newPoll, options: newOptions });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>📊 Polls</h2>
          <p>Create polls and gather team feedback</p>
        </div>
        <button onClick={() => setShowModal(true)}>+ Create Poll</button>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
        {polls.map((poll, index) => {
          const hasVoted = votedPolls.has(poll.id);
          const totalVotes = poll.totalVotes || 0;

          return (
            <div
              key={poll.id}
              className="card animate-in"
              style={{
                animationDelay: `${index * 0.05}s`,
                padding: '2rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{poll.question}</h3>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                    <span>📅 {poll.date}</span>
                    <span>👥 {totalVotes} votes</span>
                    <span style={{
                      padding: '2px 8px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '4px',
                      fontSize: '0.75rem'
                    }}>
                      {poll.category}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deletePoll(poll.id)}
                    className="btn-danger btn-sm"
                  >
                    Delete
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {poll.options.map((option: any, optIndex: number) => {
                  const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                  const isSelected = hasVoted; // Show results if voted

                  return (
                    <button
                      key={optIndex}
                      onClick={() => !hasVoted && handleVote(poll.id, optIndex)}
                      disabled={hasVoted}
                      className="btn-secondary"
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '1rem',
                        textAlign: 'left',
                        cursor: hasVoted ? 'default' : 'pointer',
                        opacity: hasVoted ? 0.9 : 1,
                        height: 'auto'
                      }}
                    >
                      {hasVoted && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${percentage}%`,
                            background: 'linear-gradient(135deg, rgba(246, 130, 31, 0.2) 0%, rgba(224, 103, 23, 0.2) 100%)',
                            transition: 'width 0.5s ease',
                            borderRadius: '6px'
                          }}
                        />
                      )}
                      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600' }}>{option.text}</span>
                        {hasVoted && (
                          <span style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--cf-orange)' }}>
                            {option.votes} ({percentage.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {polls.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📊</div>
            <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No polls yet</p>
            <p style={{ fontSize: '0.875rem' }}>Create your first poll to gather team feedback</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>📊 Create Poll</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();

              if (newPoll.options.some(opt => !opt.trim())) {
                alert('Please fill in all options');
                return;
              }

              const pollData = {
                id: Date.now().toString(),
                question: newPoll.question,
                options: newPoll.options.map(text => ({ text, votes: 0 })),
                category: newPoll.category,
                date: new Date().toLocaleDateString(),
                totalVotes: 0,
                targetGroups: newPoll.targetGroups
              };

              try {
                await api.polls.create(pollData);
                setPolls(prev => [pollData, ...prev]);
                setShowModal(false);
                setNewPoll({
                  question: "",
                  options: ["", ""],
                  category: "general",
                  targetGroups: ['all']
                });
                alert('Poll created successfully!');
              } catch (error) {
                console.error('Error creating poll:', error);
                alert('Failed to create poll');
              }
            }}>
              <div className="form-group">
                <label htmlFor="question">Poll Question *</label>
                <input
                  id="question"
                  type="text"
                  className="form-input"
                  value={newPoll.question}
                  onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                  placeholder="e.g., What should we do for team building?"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  className="form-select"
                  value={newPoll.category}
                  onChange={(e) => setNewPoll({ ...newPoll, category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="team">Team</option>
                  <option value="feedback">Feedback</option>
                  <option value="planning">Planning</option>
                </select>
              </div>

              <div className="form-group">
                <label>Options * (2-6 options)</label>
                {newPoll.options.map((option, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      required
                      style={{ flex: 1 }}
                    />
                    {newPoll.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="btn-danger btn-sm"
                        style={{ width: '40px', padding: '0' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {newPoll.options.length < 6 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="btn-secondary btn-sm"
                    style={{ marginTop: '0.5rem' }}
                  >
                    + Add Option
                  </button>
                )}
              </div>

              <GroupSelector
                selectedGroups={newPoll.targetGroups}
                onChange={(groups) => setNewPoll({ ...newPoll, targetGroups: groups })}
              />

              <div className="modal-actions">
                <button type="submit">Create Poll</button>
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
