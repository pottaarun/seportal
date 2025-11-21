import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function meta() {
  return [
    { title: "Teams - SolutionHub" },
    { name: "description", content: "Regional teams organization" },
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

export default function Teams() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesData, groupsData] = await Promise.all([
        api.employees.getAll(),
        api.groups.getAll()
      ]);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);

      // Parse groups members from JSON strings
      const parsedGroups = (Array.isArray(groupsData) ? groupsData : []).map((g: any) => ({
        ...g,
        members: typeof g.members === 'string' ? JSON.parse(g.members) : g.members,
        admins: g.admins && typeof g.admins === 'string' ? JSON.parse(g.admins) : g.admins
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

  const getPhotoUrl = (employee: Employee) => {
    if (!employee.photo_url) return null;
    return `${import.meta.env?.VITE_API_URL || 'https://seportal-api.arunpotta1024.workers.dev'}/api/employees/${employee.id}/photo?t=${Date.now()}`;
  };

  // Get group colors (cycle through predefined colors)
  const groupColors = ['#F6821F', '#2C7CFF', '#9B51E0', '#27AE60', '#E74C3C', '#F39C12', '#1ABC9C', '#34495E'];

  const getGroupColor = (index: number) => {
    return groupColors[index % groupColors.length];
  };

  // Get employees for a specific group
  const getGroupEmployees = (group: Group): Employee[] => {
    return employees.filter(emp => group.members.includes(emp.email));
  };

  const EmployeeCard = ({ employee, color }: { employee: Employee; color: string }) => {
    return (
      <div
        className="card"
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-secondary)',
          borderLeft: `4px solid ${color}`
        }}
      >
        {/* Photo */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: getPhotoUrl(employee) ? 'transparent' : 'linear-gradient(135deg, var(--cf-orange), var(--cf-blue))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '600',
            color: 'white',
            flexShrink: 0,
            overflow: 'hidden'
          }}
        >
          {getPhotoUrl(employee) ? (
            <img
              src={getPhotoUrl(employee)!}
              alt={employee.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.textContent = employee.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
              }}
            />
          ) : (
            employee.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600' }}>
            {employee.name}
          </h4>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
            {employee.title}
          </div>
          {employee.location && (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              📍 {employee.location}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p>Loading teams...</p>
      </div>
    );
  }

  const filteredGroups = selectedGroup === "all" ? groups : groups.filter(g => g.id === selectedGroup);

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2>Teams</h2>
        <p>Sales Engineering teams organized by groups</p>
      </div>

      {/* Group Filter */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedGroup("all")}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            background: selectedGroup === "all" ? 'var(--cf-orange)' : 'var(--bg-tertiary)',
            color: selectedGroup === "all" ? 'white' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          All Teams
        </button>
        {groups.map((group, index) => {
          const memberCount = getGroupEmployees(group).length;
          return (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                background: selectedGroup === group.id ? getGroupColor(index) : 'var(--bg-tertiary)',
                color: selectedGroup === group.id ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {group.name} ({memberCount})
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <h3>No Teams Yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Admins can create teams from the Admin panel.
          </p>
        </div>
      ) : (
        <div>
          {filteredGroups.map((group, index) => {
            const groupEmployees = getGroupEmployees(group);
            const groupColor = getGroupColor(index);

            return (
              <div key={group.id} style={{ marginBottom: '2rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: `3px solid ${groupColor}`
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '32px',
                      background: groupColor,
                      borderRadius: '4px'
                    }}
                  />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                      {group.name}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {group.description || 'No description'} • {groupEmployees.length} {groupEmployees.length === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                </div>

                {groupEmployees.length === 0 ? (
                  <div className="card" style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-tertiary)' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      No employees in this team yet
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                    {groupEmployees.map(employee => (
                      <EmployeeCard key={employee.id} employee={employee} color={groupColor} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem', paddingBottom: '2rem' }}>
        Please report any bugs to Arun Potta
      </div>
    </div>
  );
}
