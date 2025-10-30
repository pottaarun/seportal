import { useState } from "react";
import { useAdmin } from "../contexts/AdminContext";

export function meta() {
  return [
    { title: "Admin - SE Portal" },
    { name: "description", content: "Manage administrators" },
  ];
}

export default function Admin() {
  const { isAdmin, admins, addAdmin, removeAdmin } = useAdmin();
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2>Admin Management</h2>
          <p>Manage administrator access to the SE Portal</p>
        </div>
        <button onClick={() => setShowAddModal(true)}>
          + Add Admin
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Current Administrators</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {admins.map((email, index) => (
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
          <li>Upload logos and images for assets</li>
          <li>Moderate content across all sections</li>
          <li>Access admin-only features and settings</li>
        </ul>
      </div>

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
    </div>
  );
}
