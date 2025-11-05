import { useState, useEffect } from "react";
import { api } from "../lib/api";

interface GroupSelectorProps {
  selectedGroups: string[];
  onChange: (groups: string[]) => void;
  label?: string;
}

export function GroupSelector({ selectedGroups, onChange, label = "Share with" }: GroupSelectorProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [shareMode, setShareMode] = useState<'all' | 'groups'>(
    selectedGroups.length === 0 || selectedGroups.includes('all') ? 'all' : 'groups'
  );

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const data = await api.groups.getAll();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading groups:', e);
      setGroups([]);
    }
  };

  const handleModeChange = (mode: 'all' | 'groups') => {
    setShareMode(mode);
    if (mode === 'all') {
      onChange(['all']);
    } else {
      onChange([]);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    const newGroups = selectedGroups.includes(groupId)
      ? selectedGroups.filter(id => id !== groupId)
      : [...selectedGroups, groupId];
    onChange(newGroups);
  };

  return (
    <div className="form-group">
      <label>{label}</label>

      {/* Share mode selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => handleModeChange('all')}
          className={shareMode === 'all' ? '' : 'btn-secondary'}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            background: shareMode === 'all' ? 'var(--cf-orange)' : 'var(--bg-tertiary)',
            color: shareMode === 'all' ? 'white' : 'var(--text-primary)',
            border: shareMode === 'all' ? 'none' : '2px solid var(--border-color)'
          }}
        >
          👥 All SEs
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('groups')}
          className={shareMode === 'groups' ? '' : 'btn-secondary'}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            background: shareMode === 'groups' ? 'var(--cf-orange)' : 'var(--bg-tertiary)',
            color: shareMode === 'groups' ? 'white' : 'var(--text-primary)',
            border: shareMode === 'groups' ? 'none' : '2px solid var(--border-color)'
          }}
        >
          🎯 Specific Groups
        </button>
      </div>

      {/* Group selection */}
      {shareMode === 'groups' && (
        <div style={{
          padding: '1rem',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          {groups.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              No groups available. Admins can create groups in the Admin panel.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {groups.map((group) => (
                <label
                  key={group.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    background: selectedGroups.includes(group.id) ? 'var(--bg-primary)' : 'transparent',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.id)}
                    onChange={() => handleGroupToggle(group.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{group.name}</div>
                    {group.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {group.description}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {group.members?.length || 0} members
                  </div>
                </label>
              ))}
            </div>
          )}
          {selectedGroups.length > 0 && (
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--cf-orange)',
              marginTop: '0.75rem',
              marginBottom: 0,
              fontWeight: '500'
            }}>
              ✓ Selected {selectedGroups.length} group{selectedGroups.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
