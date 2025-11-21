import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function meta() {
  return [
    { title: "Org Chart - SolutionHub" },
    { name: "description", content: "Sales Engineering organizational chart" },
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

export default function OrgChart() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await api.employees.getAll();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading employees:', e);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Build tree structure
  const buildTree = (employees: Employee[]) => {
    const employeeMap = new Map();
    const roots: Employee[] = [];

    // Create map of all employees
    employees.forEach(emp => {
      employeeMap.set(emp.id, { ...emp, children: [] });
    });

    // Build hierarchy
    employees.forEach(emp => {
      if (emp.manager_id && employeeMap.has(emp.manager_id)) {
        employeeMap.get(emp.manager_id).children.push(employeeMap.get(emp.id));
      } else {
        roots.push(employeeMap.get(emp.id));
      }
    });

    return roots;
  };

  const getPhotoUrl = (employee: Employee) => {
    if (!employee.photo_url) return null;
    // Add timestamp to prevent caching issues
    return `${import.meta.env?.VITE_API_URL || 'https://seportal-api.arunpotta1024.workers.dev'}/api/employees/${employee.id}/photo?t=${Date.now()}`;
  };

  const EmployeeCard = ({ employee, level = 0 }: { employee: any; level?: number }) => {
    const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels
    const hasChildren = employee.children && employee.children.length > 0;

    return (
      <div style={{ marginLeft: level > 0 ? '40px' : '0', marginTop: '16px' }}>
        <div
          className="card"
          style={{
            padding: '20px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'var(--bg-secondary)',
            borderLeft: level === 0 ? '4px solid var(--cf-orange)' : level === 1 ? '4px solid var(--cf-blue)' : '4px solid var(--border-color)'
          }}
        >
          {/* Photo */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: getPhotoUrl(employee) ? 'transparent' : 'linear-gradient(135deg, var(--cf-orange), var(--cf-blue))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
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
            <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: '600' }}>
              {employee.name}
            </h3>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {employee.title}
            </div>
            {employee.department && (
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                {employee.department}
              </div>
            )}
            {employee.location && (
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                📍 {employee.location}
              </div>
            )}
            {employee.bio && (
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {employee.bio}
              </p>
            )}
          </div>

          {/* Expand/Collapse */}
          {hasChildren && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {expanded ? '▼' : '▶'} {employee.children.length} {employee.children.length === 1 ? 'report' : 'reports'}
            </button>
          )}
        </div>

        {/* Children */}
        {hasChildren && expanded && (
          <div>
            {employee.children.map((child: any) => (
              <EmployeeCard key={child.id} employee={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree(employees);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p>Loading organization chart...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2>Organization Chart</h2>
        <p>Sales Engineering team structure and reporting hierarchy</p>
      </div>

      {employees.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <h3>No Employees Yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Admins can add employees from the Admin panel.
          </p>
        </div>
      ) : (
        <div>
          {tree.map(employee => (
            <EmployeeCard key={employee.id} employee={employee} level={0} />
          ))}
        </div>
      )}

      <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem', paddingBottom: '2rem' }}>
        Please report any bugs to Arun Potta
      </div>
    </div>
  );
}
