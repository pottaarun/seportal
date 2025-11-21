import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";
import { GroupSelector } from "../components/GroupSelector";
import { getRelativeTime } from "../lib/timeUtils";

export function meta() {
  return [
    { title: "Polls - SolutionHub" },
    { name: "description", content: "Create and vote on team polls" },
  ];
}

export default function Voting() {
  const { isAdmin, currentUserEmail } = useAdmin();
  const [polls, setPolls] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newPoll, setNewPoll] = useState({
    question: "",
    options: ["", ""],
    category: "general",
    targetGroups: ['all'] as string[],
    endDate: ""
  });
  const [votedPolls, setVotedPolls] = useState<Map<string, number>>(new Map());
  const [viewingResults, setViewingResults] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute to refresh countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await api.polls.getAll();
        setPolls(Array.isArray(data) ? data : []);

        // Load user's votes from database
        if (currentUserEmail) {
          const userVotes = await api.polls.getUserVotes(currentUserEmail);
          const votesMap = new Map(Object.entries(userVotes).map(([pollId, optionIndex]) => [pollId, optionIndex as number]));
          setVotedPolls(votesMap);
        }
      } catch (e) {
        console.error('Error loading polls:', e);
        setPolls([]);
      }
    };
    loadData();
  }, [currentUserEmail]);

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
    if (!currentUserEmail) {
      alert('Please login to vote on polls');
      return;
    }

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

    const newVotedPolls = new Map(votedPolls);
    newVotedPolls.set(pollId, optionIndex);
    setVotedPolls(newVotedPolls);

    try {
      await api.polls.vote(pollId, optionIndex, currentUserEmail);
    } catch (e: any) {
      console.error('Error voting:', e);
      alert(e.message || 'Failed to vote on poll');
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
          const isViewingResults = viewingResults.has(poll.id);
          const showResults = hasVoted || isViewingResults;

          // Calculate time remaining if endDate exists
          let timeRemaining = '';
          let isPollEnded = false;
          if (poll.endDate) {
            const endDate = new Date(poll.endDate);
            const now = new Date();
            const diff = endDate.getTime() - now.getTime();

            if (diff <= 0) {
              timeRemaining = 'Ended';
              isPollEnded = true;
            } else {
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

              if (days > 0) {
                timeRemaining = `${days}d ${hours}h remaining`;
              } else if (hours > 0) {
                timeRemaining = `${hours}h ${minutes}m remaining`;
              } else {
                timeRemaining = `${minutes}m remaining`;
              }
            }
          }

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
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-tertiary)', flexWrap: 'wrap' }}>
                    <span>📅 {poll.createdAt ? getRelativeTime(poll.createdAt) : poll.date}</span>
                    <span>👥 {totalVotes} votes</span>
                    <span style={{
                      padding: '2px 8px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '4px',
                      fontSize: '0.75rem'
                    }}>
                      {poll.category}
                    </span>
                    {timeRemaining && (
                      <span style={{
                        padding: '2px 8px',
                        background: isPollEnded ? 'rgba(220, 38, 38, 0.1)' : 'rgba(246, 130, 31, 0.1)',
                        color: isPollEnded ? '#dc2626' : 'var(--cf-orange)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        ⏰ {timeRemaining}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {!hasVoted && !isPollEnded && (
                    <button
                      onClick={() => {
                        const newSet = new Set(viewingResults);
                        if (isViewingResults) {
                          newSet.delete(poll.id);
                        } else {
                          newSet.add(poll.id);
                        }
                        setViewingResults(newSet);
                      }}
                      className="btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      {isViewingResults ? '🔒 Hide Results' : '👁️ View Results'}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => deletePoll(poll.id)}
                      className="btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {poll.options.map((option: any, optIndex: number) => {
                  const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;

                  return (
                    <button
                      key={optIndex}
                      onClick={() => !hasVoted && !isPollEnded && !isViewingResults && handleVote(poll.id, optIndex)}
                      disabled={hasVoted || isPollEnded || isViewingResults}
                      className="btn-secondary"
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '1rem',
                        textAlign: 'left',
                        cursor: (hasVoted || isPollEnded || isViewingResults) ? 'default' : 'pointer',
                        opacity: (hasVoted || isPollEnded || isViewingResults) ? 0.9 : 1,
                        height: 'auto'
                      }}
                    >
                      {showResults && (
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
                        {showResults && (
                          <span style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--cf-orange)' }}>
                            {option.votes} ({percentage.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {isPollEnded && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: 'rgba(220, 38, 38, 0.1)',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  🔒 This poll has ended
                </div>
              )}
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
                createdAt: new Date().toISOString(),
                totalVotes: 0,
                targetGroups: newPoll.targetGroups,
                endDate: newPoll.endDate || null
              };

              try {
                await api.polls.create(pollData);
                setPolls(prev => [pollData, ...prev]);
                setShowModal(false);
                setNewPoll({
                  question: "",
                  options: ["", ""],
                  category: "general",
                  targetGroups: ['all'],
                  endDate: ""
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
                <label htmlFor="endDate">End Date (Optional)</label>
                <input
                  id="endDate"
                  type="datetime-local"
                  className="form-input"
                  value={newPoll.endDate}
                  onChange={(e) => setNewPoll({ ...newPoll, endDate: e.target.value })}
                  placeholder="Leave empty for no end date"
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                  When should this poll end? Leave empty if the poll should run indefinitely.
                </p>
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

      <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem', paddingBottom: '2rem' }}>
        Please report any bugs to Arun Potta
      </div>
    </div>
  );
}
