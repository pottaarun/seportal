import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";

export function meta() {
  return [
    { title: "Admin - SE Portal" },
    { name: "description", content: "Manage administrators and groups" },
  ];
}

export default function Admin() {
  const { isAdmin, admins, addAdmin, removeAdmin } = useAdmin();
  const [activeTab, setActiveTab] = useState("admins");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Groups state
  const [groups, setGroups] = useState<any[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    members: [] as string[]
  });
  const [memberEmail, setMemberEmail] = useState("");

  useEffect(() => {
    if (activeTab === "groups") {
      loadGroups();
    }
  }, [activeTab]);

  const loadGroups = async () => {
    try {
      const data = await api.groups.getAll();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading groups:', e);
      setGroups([]);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h2>Access Denied</h2>
        <p>You must be an administrator to access this page.</p>
      </div>
    );
  }

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminEmail && !admins.includes(newAdminEmail)) {
      addAdmin(newAdminEmail);
      setNewAdminEmail("");
      setShowAddModal(false);
    }
  };

  const handleRemoveAdmin = (email: string) => {
    if (admins.length === 1) {
      alert("Cannot remove the last admin!");
      return;
    }
    if (confirm(`Remove ${email} from administrators?`)) {
      removeAdmin(email);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const groupData = {
        id: Date.now().toString(),
        name: newGroup.name,
        description: newGroup.description,
        members: newGroup.members,
        createdAt: new Date().toISOString()
      };
      await api.groups.create(groupData);
      await loadGroups();
      setShowGroupModal(false);
      setNewGroup({ name: "", description: "", members: [] });
      alert('Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    try {
      await api.groups.update(editingGroup.id, {
        name: newGroup.name,
        description: newGroup.description,
        members: newGroup.members
      });
      await loadGroups();
      setShowGroupModal(false);
      setEditingGroup(null);
      setNewGroup({ name: "", description: "", members: [] });
      alert('Group updated successfully!');
    } catch (error) {
      console.error('Error updating group:', error);
      alert('Failed to update group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('Are you sure you want to delete this group?')) {
      try {
        await api.groups.delete(groupId);
        await loadGroups();
        alert('Group deleted successfully!');
      } catch (error) {
        console.error('Error deleting group:', error);
        alert('Failed to delete group');
      }
    }
  };

  const handleAddMember = () => {
    if (memberEmail && !newGroup.members.includes(memberEmail)) {
      setNewGroup({ ...newGroup, members: [...newGroup.members, memberEmail] });
      setMemberEmail("");
    }
  };

  const handleRemoveMember = (email: string) => {
    setNewGroup({
      ...newGroup,
      members: newGroup.members.filter(m => m !== email)
    });
  };

  const openEditGroup = (group: any) => {
    setEditingGroup(group);
    setNewGroup({
      name: group.name,
      description: group.description,
      members: group.members || []
    });
    setShowGroupModal(true);
  };

  const openNewGroup = () => {
    setEditingGroup(null);
    setNewGroup({ name: "", description: "", members: [] });
    setShowGroupModal(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2>Admin Panel</h2>
          <p>Manage administrators and user groups</p>
        </div>
        {activeTab === "admins" && (
          <button onClick={() => setShowAddModal(true)}>
            + Add Admin
          </button>
        )}
        {activeTab === "groups" && (
          <button onClick={openNewGroup}>
            + Create Group
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab("admins")}
          style={{
            padding: '1rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === "admins" ? '3px solid var(--cf-orange)' : '3px solid transparent',
            color: activeTab === "admins" ? 'var(--cf-orange)' : 'var(--text-secondary)',
            fontWeight: activeTab === "admins" ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Administrators
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          style={{
            padding: '1rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === "groups" ? '3px solid var(--cf-orange)' : '3px solid transparent',
            color: activeTab === "groups" ? 'var(--cf-orange)' : 'var(--text-secondary)',
            fontWeight: activeTab === "groups" ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Groups
        </button>
      </div>

      {/* Admins Tab */}
      {activeTab === "admins" && (
        <>
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Current Administrators</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {admins.map((email) => (
                <div
                  key={email}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>
                      {email}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Administrator
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAdmin(email)}
                    className="btn-secondary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      background: 'transparent',
                      color: 'var(--error)',
                      border: '1px solid var(--error)'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Admin Capabilities</h3>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <li>Delete assets, scripts, events, and shoutouts</li>
              <li>Add and remove other administrators</li>
              <li>Create and manage user groups</li>
              <li>Upload logos and images for assets</li>
              <li>Moderate content across all sections</li>
              <li>Access admin-only features and settings</li>
            </ul>
          </div>
        </>
      )}

      {/* Groups Tab */}
      {activeTab === "groups" && (
        <div>
          {groups.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
              <h3 style={{ marginBottom: '0.5rem' }}>No groups yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Create groups to organize your team members
              </p>
              <button onClick={openNewGroup}>Create First Group</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {groups.map((group) => (
                <div key={group.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.5rem 0' }}>{group.name}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
                        {group.description}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {group.members && group.members.length > 0 ? (
                          group.members.map((member: string) => (
                            <span
                              key={member}
                              style={{
                                padding: '4px 12px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              {member}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            No members yet
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEditGroup(group)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Administrator</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddAdmin}>
              <div className="form-group">
                <label htmlFor="adminEmail">Email Address *</label>
                <input
                  id="adminEmail"
                  type="email"
                  className="form-input"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@cloudflare.com"
                  required
                />
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                  This user will be able to login and access admin features.
                </p>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit">Add Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Group Modal */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>{editingGroup ? 'Edit Group' : 'Create Group'}</h3>
              <button className="modal-close" onClick={() => setShowGroupModal(false)}>×</button>
            </div>

            <form onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}>
              <div className="form-group">
                <label htmlFor="groupName">Group Name *</label>
                <input
                  id="groupName"
                  type="text"
                  className="form-input"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., EMEA Team, Enterprise SEs"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="groupDescription">Description</label>
                <textarea
                  id="groupDescription"
                  className="form-input"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Brief description of this group..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="memberEmail">Group Members</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    id="memberEmail"
                    type="email"
                    className="form-input"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="user@cloudflare.com"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="btn-secondary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    + Add
                  </button>
                </div>
                {newGroup.members.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {newGroup.members.map((member) => (
                      <div
                        key={member}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--bg-tertiary)',
                          borderRadius: '8px',
                          fontSize: '0.875rem'
                        }}
                      >
                        <span>{member}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--error)',
                            cursor: 'pointer',
                            fontSize: '1.25rem',
                            padding: '0 4px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowGroupModal(false)}>
                  Cancel
                </button>
                <button type="submit">
                  {editingGroup ? 'Update Group' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
