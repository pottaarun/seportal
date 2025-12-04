import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";
import { getRelativeTime } from "../lib/timeUtils";

export function meta() {
  return [
    { title: "Feature Requests - SolutionHub" },
    { name: "description", content: "Product feature requests and voting" },
  ];
}

interface Opportunity {
  id: string;
  user_email: string;
  user_name: string;
  opportunity_value: number;
  customer_name?: string;
  sfdc_link?: string;
  description?: string;
  created_at: string;
}

interface FeatureRequest {
  id: string;
  product_name: string;
  feature: string;
  opportunity_value: number;
  submitter_email: string;
  submitter_name: string;
  upvotes: number;
  created_at: string;
  opportunities: Opportunity[];
}

export default function FeatureRequests() {
  const { isAdmin } = useAdmin();
  const [showModal, setShowModal] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [upvotedRequests, setUpvotedRequests] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'default' | 'votes' | 'value'>('default');
  const [newRequest, setNewRequest] = useState({
    productName: "",
    feature: "",
    opportunityValue: "",
  });
  const [newOpportunityValue, setNewOpportunityValue] = useState("");
  const [newOpportunityDescription, setNewOpportunityDescription] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newSfdcLink, setNewSfdcLink] = useState("");

  useEffect(() => {
    const loadFeatureRequests = async () => {
      try {
        const userEmail = localStorage.getItem('seportal_user') || 'anonymous';

        // Load feature requests
        const data = await api.featureRequests.getAll();
        setFeatureRequests(data);

        // Load user's upvotes
        const upvotedIds = await api.featureRequests.getUserUpvotes(userEmail);
        setUpvotedRequests(new Set(upvotedIds));
      } catch (e) {
        console.error('Error loading feature requests:', e);
      }
    };
    loadFeatureRequests();
  }, []);

  const handleUpvote = async (requestId: string) => {
    const userEmail = localStorage.getItem('seportal_user') || 'anonymous';

    try {
      await api.featureRequests.upvote(requestId, userEmail);

      // Reload feature requests and upvotes
      const data = await api.featureRequests.getAll();
      setFeatureRequests(data);

      const upvotedIds = await api.featureRequests.getUserUpvotes(userEmail);
      setUpvotedRequests(new Set(upvotedIds));
    } catch (error) {
      console.error('Failed to upvote feature request:', error);
    }
  };

  const deleteFeatureRequest = async (requestId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this feature request?');
    if (confirmed) {
      try {
        await api.featureRequests.delete(requestId);
        setFeatureRequests(prev => prev.filter(req => req.id !== requestId));
        alert('Feature request deleted successfully!');
      } catch (e) {
        console.error('Error deleting feature request:', e);
        alert('Failed to delete feature request');
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getSortedRequests = () => {
    const sorted = [...featureRequests];

    switch (sortBy) {
      case 'votes':
        // Sort by upvotes only (descending), then by created date (oldest first)
        sorted.sort((a, b) => {
          if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        break;
      case 'value':
        // Sort by opportunity value only (descending), then by created date (oldest first)
        sorted.sort((a, b) => {
          if (b.opportunity_value !== a.opportunity_value) return b.opportunity_value - a.opportunity_value;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        break;
      case 'default':
      default:
        // Default: upvotes DESC → opportunity value DESC → created date ASC
        sorted.sort((a, b) => {
          if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
          if (b.opportunity_value !== a.opportunity_value) return b.opportunity_value - a.opportunity_value;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        break;
    }

    return sorted;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>💡 Feature Requests</h2>
          <p>Submit and vote on product feature requests</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="sort-select" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'default' | 'votes' | 'value')}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="default">Default (Votes → Value)</option>
              <option value="votes">Most Voted</option>
              <option value="value">Highest Value</option>
            </select>
          </div>
          <button onClick={() => setShowModal(true)}>+ Submit Feature Request</button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
        {getSortedRequests().map((request, index) => (
          <div
            key={request.id}
            className="card animate-in"
            style={{
              animationDelay: `${index * 0.05}s`,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              gap: '1.5rem',
              padding: '1.5rem',
            }}
          >
            {/* Upvote Section */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              minWidth: '80px',
              borderRight: '1px solid var(--border-color)',
              paddingRight: '1.5rem',
            }}>
              <button
                onClick={() => handleUpvote(request.id)}
                style={{
                  background: upvotedRequests.has(request.id) ? 'var(--cf-orange)' : 'transparent',
                  color: upvotedRequests.has(request.id) ? 'white' : 'var(--text-primary)',
                  border: upvotedRequests.has(request.id) ? 'none' : '2px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  width: '50px',
                  height: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: upvotedRequests.has(request.id) ? '0 2px 8px rgba(246, 130, 31, 0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!upvotedRequests.has(request.id)) {
                    e.currentTarget.style.borderColor = 'var(--cf-orange)';
                    e.currentTarget.style.color = 'var(--cf-orange)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!upvotedRequests.has(request.id)) {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
              >
                ▲
              </button>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: upvotedRequests.has(request.id) ? 'var(--cf-orange)' : 'var(--text-primary)',
              }}>
                {request.upvotes}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                votes
              </div>
            </div>

            {/* Content Section */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
                      {request.feature}
                    </h3>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: 'var(--cf-blue)',
                      color: 'white',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                    }}>
                      {request.product_name}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>💰</span>
                      <span style={{ fontWeight: '600', color: 'var(--success)', fontSize: '1rem' }}>
                        {formatCurrency(request.opportunity_value)}
                      </span>
                      <span>total opportunity ({request.opportunities?.length || 0} {request.opportunities?.length === 1 ? 'SE' : 'SEs'})</span>
                    </div>
                    <div>•</div>
                    <div>
                      Submitted by <strong>{request.submitter_name}</strong>
                    </div>
                    <div>•</div>
                    <div>{getRelativeTime(request.created_at)}</div>
                  </div>

                  {/* Opportunities List */}
                  {request.opportunities && request.opportunities.length > 0 && (
                    <div style={{
                      background: 'var(--bg-tertiary)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      marginBottom: '0.75rem',
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        Opportunities from SEs ({request.opportunities.length}):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {request.opportunities.map((opp, idx) => {
                          const currentUserEmail = localStorage.getItem('seportal_user') || 'anonymous';
                          const isCurrentUser = opp.user_email === currentUserEmail;

                          return (
                            <div
                              key={opp.id}
                              style={{
                                display: 'flex',
                                alignItems: 'start',
                                justifyContent: 'space-between',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                background: 'var(--bg-secondary)',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                border: isCurrentUser ? '2px solid var(--cf-orange)' : '1px solid var(--border-color)',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{opp.user_name}</span>
                                  <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                                  <span style={{ fontWeight: '700', color: 'var(--success)' }}>{formatCurrency(opp.opportunity_value)}</span>
                                  {isCurrentUser && (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--cf-orange)', fontWeight: '600' }}>(You)</span>
                                  )}
                                </div>
                                {opp.customer_name && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                    <strong>Customer:</strong> {opp.customer_name}
                                    {opp.sfdc_link && (
                                      <>
                                        {' '}•{' '}
                                        <a
                                          href={opp.sfdc_link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: 'var(--cf-blue)', textDecoration: 'underline' }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          SFDC Link
                                        </a>
                                      </>
                                    )}
                                  </div>
                                )}
                                {opp.description && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                    "{opp.description}"
                                  </div>
                                )}
                              </div>
                              {isCurrentUser && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Delete this opportunity?')) {
                                      try {
                                        await api.featureRequests.deleteOpportunity(request.id, opp.id, currentUserEmail);
                                        const data = await api.featureRequests.getAll();
                                        setFeatureRequests(data);
                                      } catch (error) {
                                        console.error('Error deleting opportunity:', error);
                                        alert('Failed to delete opportunity');
                                      }
                                    }
                                  }}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.7rem',
                                    background: 'transparent',
                                    color: 'var(--error)',
                                    border: '1px solid var(--error)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add Opportunity Button */}
                  <button
                    onClick={() => {
                      setSelectedRequestId(request.id);
                      setShowOpportunityModal(true);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      background: 'transparent',
                      color: 'var(--cf-blue)',
                      border: '1px solid var(--cf-blue)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--cf-blue)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--cf-blue)';
                    }}
                  >
                    + Add My Opportunity
                  </button>
                </div>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteFeatureRequest(request.id);
                    }}
                    type="button"
                    className="btn-danger btn-sm"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {getSortedRequests().length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: 'var(--text-tertiary)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💡</div>
          <p>No feature requests yet. Be the first to submit one!</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💡 Submit Feature Request</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();

              const currentUser = localStorage.getItem('seportal_user_name') || 'Anonymous';
              const currentEmail = localStorage.getItem('seportal_user') || 'anonymous@example.com';

              const opportunityValue = parseFloat(newRequest.opportunityValue);
              if (isNaN(opportunityValue) || opportunityValue < 0) {
                alert('Please enter a valid opportunity value');
                return;
              }

              const newFeatureRequest = {
                id: `fr-${Date.now()}`,
                productName: newRequest.productName,
                feature: newRequest.feature,
                opportunityValue: opportunityValue,
                submitterEmail: currentEmail,
                submitterName: currentUser,
              };

              try {
                await api.featureRequests.create(newFeatureRequest);

                // Reload feature requests
                const data = await api.featureRequests.getAll();
                setFeatureRequests(data);

                setShowModal(false);
                setNewRequest({ productName: "", feature: "", opportunityValue: "" });

                alert('Feature request submitted successfully!');
              } catch (error) {
                console.error('Error submitting feature request:', error);
                alert('Failed to submit feature request');
              }
            }}>
              <div className="form-group">
                <label htmlFor="productName">Product Name *</label>
                <input
                  id="productName"
                  type="text"
                  className="form-input"
                  value={newRequest.productName}
                  onChange={(e) => setNewRequest({ ...newRequest, productName: e.target.value })}
                  placeholder="e.g., Workers, R2, D1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="feature">Feature Description *</label>
                <textarea
                  id="feature"
                  className="form-input"
                  value={newRequest.feature}
                  onChange={(e) => setNewRequest({ ...newRequest, feature: e.target.value })}
                  placeholder="Describe the feature you'd like to see..."
                  rows={4}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="opportunityValue">Opportunity Value (USD) *</label>
                <input
                  id="opportunityValue"
                  type="number"
                  className="form-input"
                  value={newRequest.opportunityValue}
                  onChange={(e) => setNewRequest({ ...newRequest, opportunityValue: e.target.value })}
                  placeholder="e.g., 50000"
                  min="0"
                  step="1"
                  required
                />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                  Enter the potential deal value or revenue opportunity for this feature
                </p>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Opportunity Modal */}
      {showOpportunityModal && (
        <div className="modal-overlay" onClick={() => setShowOpportunityModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💰 Add Your Opportunity</h3>
              <button className="modal-close" onClick={() => setShowOpportunityModal(false)}>×</button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Add a new opportunity to this feature request. You can add multiple opportunities for different deals or use cases.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();

              const currentUser = localStorage.getItem('seportal_user_name') || 'Anonymous';
              const currentEmail = localStorage.getItem('seportal_user') || 'anonymous@example.com';

              const opportunityValue = parseFloat(newOpportunityValue);
              if (isNaN(opportunityValue) || opportunityValue < 0) {
                alert('Please enter a valid opportunity value');
                return;
              }

              try {
                await api.featureRequests.addOpportunity(
                  selectedRequestId,
                  currentEmail,
                  currentUser,
                  opportunityValue,
                  newCustomerName || undefined,
                  newSfdcLink || undefined,
                  newOpportunityDescription || undefined
                );

                // Reload feature requests
                const data = await api.featureRequests.getAll();
                setFeatureRequests(data);

                setShowOpportunityModal(false);
                setNewOpportunityValue("");
                setNewCustomerName("");
                setNewSfdcLink("");
                setNewOpportunityDescription("");
                setSelectedRequestId("");

                alert('Opportunity added successfully!');
              } catch (error) {
                console.error('Error adding opportunity:', error);
                alert('Failed to add opportunity');
              }
            }}>
              <div className="form-group">
                <label htmlFor="opportunityValue">Opportunity Value (USD) *</label>
                <input
                  id="opportunityValue"
                  type="number"
                  className="form-input"
                  value={newOpportunityValue}
                  onChange={(e) => setNewOpportunityValue(e.target.value)}
                  placeholder="e.g., 50000"
                  min="0"
                  step="1"
                  required
                  autoFocus
                />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                  Enter your potential deal value or revenue opportunity for this feature
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="customerName">Customer Name</label>
                <input
                  id="customerName"
                  type="text"
                  className="form-input"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                  The customer or prospect this opportunity is for
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="sfdcLink">Salesforce Link (optional)</label>
                <input
                  id="sfdcLink"
                  type="url"
                  className="form-input"
                  value={newSfdcLink}
                  onChange={(e) => setNewSfdcLink(e.target.value)}
                  placeholder="e.g., https://cloudflare.lightning.force.com/..."
                />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                  Link to the Salesforce opportunity or account
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="opportunityDescription">Description (optional)</label>
                <textarea
                  id="opportunityDescription"
                  className="form-input"
                  value={newOpportunityDescription}
                  onChange={(e) => setNewOpportunityDescription(e.target.value)}
                  placeholder="e.g., Use case, deal context, or additional notes..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                  Add additional context about this opportunity
                </p>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowOpportunityModal(false)}>
                  Cancel
                </button>
                <button type="submit">Add Opportunity</button>
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
