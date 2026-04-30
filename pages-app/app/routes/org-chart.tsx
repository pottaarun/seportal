import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { WorldMap } from "../components/WorldMap";
// Reuse the RFx page's design language — same hero/panel/segment patterns
// used on /ai-hub and /rfx so the three pages feel like one product.
import "./rfx.css";

export function meta() {
  return [
    { title: "Teams & Org - SolutionHub" },
    { name: "description", content: "Sales Engineering teams, reporting hierarchy, and geographic distribution" },
  ];
}

interface Employee {
  id: string;
  name: string;
  email: string;
  title: string;
  department?: string;
  manager_id?: string;
  photo_url?: string;
  bio?: string;
  location?: string;
  start_date?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  members: string[]; // Array of email addresses
  admins?: string[];
}

type ViewMode = 'teams' | 'tree' | 'map';

// Color palette for team accents (cycles)
const GROUP_COLORS = ['#F6821F', '#2C7CFF', '#9B51E0', '#27AE60', '#E74C3C', '#F39C12', '#1ABC9C', '#34495E'];

const getPhotoUrl = (employee: Employee) => {
  if (!employee.photo_url) return null;
  // Cache-bust per render so admin photo updates show without a hard refresh.
  return `${import.meta.env?.VITE_API_URL || 'https://seportal-api.arunpotta1024.workers.dev'}/api/employees/${employee.id}/photo?t=${Date.now()}`;
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function buildTree(employees: Employee[]) {
  const employeeMap = new Map<string, any>();
  const roots: any[] = [];

  employees.forEach(emp => {
    employeeMap.set(emp.id, { ...emp, children: [] });
  });

  employees.forEach(emp => {
    if (emp.manager_id && employeeMap.has(emp.manager_id)) {
      employeeMap.get(emp.manager_id).children.push(employeeMap.get(emp.id));
    } else {
      roots.push(employeeMap.get(emp.id));
    }
  });

  return roots;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// ──────────────────────────────────────────────────────────────────────────────
// Avatar (shared)
// ──────────────────────────────────────────────────────────────────────────────

function Avatar({ employee, size = 48 }: { employee: Employee; size?: number }) {
  const photo = getPhotoUrl(employee);
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: photo ? 'transparent' : 'linear-gradient(135deg, var(--cf-orange), var(--cf-blue))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.round(size * 0.38)}px`,
        fontWeight: 600,
        color: 'white',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {photo ? (
        <img
          src={photo}
          alt={employee.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.textContent = initials(employee.name);
          }}
        />
      ) : (
        initials(employee.name)
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Teams view (formerly /teams)
// ──────────────────────────────────────────────────────────────────────────────

function TeamMemberCard({ employee, color }: { employee: Employee; color: string }) {
  return (
    <div
      className="card"
      style={{
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--bg-secondary)',
        borderLeft: `4px solid ${color}`,
        borderRadius: 12,
      }}
    >
      <Avatar employee={employee} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 600 }}>{employee.name}</h4>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>{employee.title}</div>
        {employee.location && (
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>📍 {employee.location}</div>
        )}
      </div>
    </div>
  );
}

function TeamsView({
  employees,
  groups,
  selectedGroup,
  onSelectGroup,
}: {
  employees: Employee[];
  groups: Group[];
  selectedGroup: string;
  onSelectGroup: (id: string) => void;
}) {
  const getGroupColor = (index: number) => GROUP_COLORS[index % GROUP_COLORS.length];
  const getGroupEmployees = (g: Group) => employees.filter(emp => g.members.includes(emp.email));

  if (groups.length === 0) {
    return (
      <div className="rfx-panel" style={{ textAlign: 'center', padding: '4rem' }}>
        <h3 className="rfx-h">No Teams Yet</h3>
        <p className="rfx-muted">Admins can create teams from the Admin panel.</p>
      </div>
    );
  }

  const filteredGroups = selectedGroup === 'all' ? groups : groups.filter(g => g.id === selectedGroup);

  return (
    <div>
      {/* Group filter chips — solid color when active, neutral when not */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onSelectGroup('all')}
          className={`rfx-btn ${selectedGroup === 'all' ? 'rfx-btn--primary' : ''}`}
          type="button"
        >
          All Teams
        </button>
        {groups.map((group, index) => {
          const memberCount = getGroupEmployees(group).length;
          const isActive = selectedGroup === group.id;
          const color = getGroupColor(index);
          return (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className="rfx-btn"
              type="button"
              style={isActive ? {
                background: color,
                color: '#fff',
                border: 'none',
                boxShadow: `0 6px 16px ${color}40`,
              } : undefined}
            >
              {group.name} ({memberCount})
            </button>
          );
        })}
      </div>

      {filteredGroups.map((group, index) => {
        const groupEmployees = getGroupEmployees(group);
        // Use the original index in `groups` so colors stay stable when filtering
        const originalIndex = groups.findIndex(g => g.id === group.id);
        const groupColor = getGroupColor(originalIndex >= 0 ? originalIndex : index);

        return (
          <div key={group.id} style={{ marginBottom: '2rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: `3px solid ${groupColor}`,
              }}
            >
              <div style={{ width: 8, height: 32, background: groupColor, borderRadius: 4 }} />
              <div>
                <h3 className="rfx-h rfx-h-sm" style={{ margin: 0 }}>{group.name}</h3>
                <p className="rfx-muted" style={{ marginTop: 4, fontSize: 13 }}>
                  {group.description || 'No description'} • {groupEmployees.length} {groupEmployees.length === 1 ? 'member' : 'members'}
                </p>
              </div>
            </div>

            {groupEmployees.length === 0 ? (
              <div className="rfx-panel" style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-tertiary)' }}>
                <p className="rfx-muted" style={{ margin: 0 }}>No employees in this team yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {groupEmployees.map(employee => (
                  <TeamMemberCard key={employee.id} employee={employee} color={groupColor} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Hierarchy view (formerly /org-chart tree)
// ──────────────────────────────────────────────────────────────────────────────

function HierarchyCard({ employee, level = 0 }: { employee: any; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = employee.children && employee.children.length > 0;

  return (
    <div style={{ marginLeft: level > 0 ? '40px' : '0', marginTop: '16px' }}>
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'var(--bg-secondary)',
          borderRadius: 12,
          borderLeft: level === 0 ? '4px solid var(--cf-orange)' : level === 1 ? '4px solid var(--cf-blue)' : '4px solid var(--border-color)',
        }}
      >
        <Avatar employee={employee} size={64} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: 17, fontWeight: 600 }}>{employee.name}</h3>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>{employee.title}</div>
          {employee.department && (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{employee.department}</div>
          )}
          {employee.location && (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>📍 {employee.location}</div>
          )}
          {employee.bio && (
            <p style={{ margin: '8px 0 0 0', fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {employee.bio}
            </p>
          )}
        </div>

        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="rfx-btn rfx-btn--subtle"
            type="button"
            style={{ fontSize: 12 }}
          >
            {expanded ? '▼' : '▶'} {employee.children.length} {employee.children.length === 1 ? 'report' : 'reports'}
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {employee.children.map((child: any) => (
            <HierarchyCard key={child.id} employee={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function HierarchyView({ employees }: { employees: Employee[] }) {
  if (employees.length === 0) {
    return (
      <div className="rfx-panel" style={{ textAlign: 'center', padding: '4rem' }}>
        <h3 className="rfx-h">No Employees Yet</h3>
        <p className="rfx-muted">Admins can add employees from the Admin panel.</p>
      </div>
    );
  }
  const tree = buildTree(employees);
  return (
    <div>
      {tree.map(employee => (
        <HierarchyCard key={employee.id} employee={employee} level={0} />
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page — Teams & Org (merges /teams + /org-chart into one tab)
// ──────────────────────────────────────────────────────────────────────────────

export default function TeamsAndOrg() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('teams');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  // Honor a deep-link query param (?view=tree|map|teams) so the legacy
  // /org-chart bookmarks still land on Hierarchy by default.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    if (v === 'tree' || v === 'map' || v === 'teams') {
      setView(v);
      return;
    }
    // Path-based default: /org-chart starts on Hierarchy, /teams starts on Teams.
    if (window.location.pathname === '/org-chart') {
      setView('tree');
    }
  }, []);

  const loadData = async () => {
    try {
      const [employeesData, groupsData] = await Promise.all([
        api.employees.getAll(),
        api.groups.getAll(),
      ]);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);

      const parsedGroups = (Array.isArray(groupsData) ? groupsData : []).map((g: any) => ({
        ...g,
        members: typeof g.members === 'string' ? JSON.parse(g.members) : g.members,
        admins: g.admins && typeof g.admins === 'string' ? JSON.parse(g.admins) : g.admins,
      }));
      setGroups(parsedGroups);
    } catch (e) {
      console.error('Error loading data:', e);
      setEmployees([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const teamCount = groups.length;
  const headcount = employees.length;
  const locations = new Set(employees.map(e => e.location).filter(Boolean) as string[]);

  if (loading) {
    return (
      <div className="rfx-page">
        <div className="rfx-loading">
          <div className="rfx-spinner" />
          <span>Loading teams &amp; org…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rfx-page" style={{ paddingBottom: '40px' }}>
      {/* Header — RFx pattern: serif title + subtitle + status pills */}
      <div className="rfx-header animate-in">
        <h2 className="rfx-title">Teams &amp; Org</h2>
        <p className="rfx-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
          Sales Engineering org structure — by team, by reporting line, and by location.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 9999, fontSize: 12,
            background: 'rgba(16,185,129,0.1)', color: '#10B981', fontWeight: 600,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            {headcount} {headcount === 1 ? 'person' : 'people'}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 9999, fontSize: 12,
            background: 'rgba(99,102,241,0.1)', color: '#6366F1', fontWeight: 600,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1' }} />
            {teamCount} {teamCount === 1 ? 'team' : 'teams'}
          </span>
          {locations.size > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 9999, fontSize: 12,
              background: 'rgba(246,130,31,0.1)', color: '#F6821F', fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F6821F' }} />
              {locations.size} {locations.size === 1 ? 'location' : 'locations'}
            </span>
          )}
        </div>
      </div>

      {/* View segmented control — same pattern as RFx tabs */}
      <div className="rfx-tabs">
        <div className="rfx-tabs-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <button
            onClick={() => setView('teams')}
            className={`rfx-btn rfx-btn--seg ${view === 'teams' ? 'rfx-btn--seg-active' : ''}`}
            type="button"
          >
            Teams
          </button>
          <button
            onClick={() => setView('tree')}
            className={`rfx-btn rfx-btn--seg ${view === 'tree' ? 'rfx-btn--seg-active' : ''}`}
            type="button"
          >
            Hierarchy
          </button>
          <button
            onClick={() => setView('map')}
            className={`rfx-btn rfx-btn--seg ${view === 'map' ? 'rfx-btn--seg-active' : ''}`}
            type="button"
          >
            Map
          </button>
        </div>
      </div>

      {/* View body */}
      {view === 'teams' && (
        <TeamsView
          employees={employees}
          groups={groups}
          selectedGroup={selectedGroup}
          onSelectGroup={setSelectedGroup}
        />
      )}
      {view === 'tree' && <HierarchyView employees={employees} />}
      {view === 'map' && (
        employees.length === 0 ? (
          <div className="rfx-panel" style={{ textAlign: 'center', padding: '4rem' }}>
            <h3 className="rfx-h">No Employees Yet</h3>
            <p className="rfx-muted">Admins can add employees from the Admin panel.</p>
          </div>
        ) : (
          <WorldMap employees={employees} getPhotoUrl={getPhotoUrl} />
        )
      )}

      <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem', paddingBottom: '2rem' }}>
        Please report any bugs to Arun Potta
      </div>
    </div>
  );
}
