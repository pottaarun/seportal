import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function meta() {
  return [
    { title: "Reports - SolutionHub" },
    { name: "description", content: "Team reports and analytics" },
  ];
}

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('headcount');
  const [headcount, setHeadcount] = useState<any[]>([]);
  const [skillsByTeam, setSkillsByTeam] = useState<any[]>([]);
  const [courseByManager, setCourseByManager] = useState<any[]>([]);
  const [onboarding, setOnboarding] = useState<any[]>([]);
  const [skillsGap, setSkillsGap] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hc, sbt, cbm, ob, sg] = await Promise.all([
        api.reports.headcount().catch(() => []),
        api.reports.skillsByTeam().catch(() => []),
        api.reports.courseCompletionByManager().catch(() => []),
        api.reports.onboardingProgress().catch(() => []),
        api.reports.skillsGapSummary().catch(() => []),
      ]);
      setHeadcount(Array.isArray(hc) ? hc : []);
      setSkillsByTeam(Array.isArray(sbt) ? sbt : []);
      setCourseByManager(Array.isArray(cbm) ? cbm : []);
      setOnboarding(Array.isArray(ob) ? ob : []);
      setSkillsGap(Array.isArray(sg) ? sg : []);
    } catch (e) {
      console.error('Error loading reports:', e);
    }
    setLoading(false);
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600,
    color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px',
    borderBottom: '2px solid var(--border-color)', background: 'var(--bg-secondary)',
  };
  const tdStyle: React.CSSProperties = {
    padding: '10px 12px', fontSize: '13px', borderBottom: '1px solid var(--border-color)',
  };

  const tabs = [
    { id: 'headcount', label: 'Headcount' },
    { id: 'skills-gap', label: 'Skills Gap' },
    { id: 'skills-by-team', label: 'Skills by Team' },
    { id: 'course-progress', label: 'Course Progress' },
    { id: 'onboarding', label: 'Onboarding' },
  ];

  // Aggregate headcount by region
  const regionTotals = headcount.reduce((acc: Record<string, number>, row: any) => {
    acc[row.region] = (acc[row.region] || 0) + row.count;
    return acc;
  }, {} as Record<string, number>);
  const totalEmployees = Object.values(regionTotals).reduce((a: number, b: number) => a + b, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--cf-orange)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 6px 0' }}>Reports & Analytics</h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
          Team insights powered by employee data, skills assessments, and course progress
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '3px solid var(--cf-orange)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Total Employees</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{totalEmployees}</div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '3px solid #3B82F6' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Regions</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{Object.keys(regionTotals).length}</div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '3px solid #10B981' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Skills Assessed</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{skillsGap.filter((s: any) => s.total_assessed > 0).length}</div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '3px solid #8B5CF6' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>New Hires (90d)</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{onboarding.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem', background: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid var(--cf-orange)' : '3px solid transparent',
              color: activeTab === tab.id ? 'var(--cf-orange)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 600 : 400, cursor: 'pointer', fontSize: '14px',
              transition: 'all 0.2s ease',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Headcount Tab */}
      {activeTab === 'headcount' && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Headcount by Region & Department</h3>
          {headcount.length > 0 ? (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Region</th>
                    <th style={thStyle}>Department</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {headcount.map((row: any, i: number) => (
                    <tr key={i}>
                      <td style={tdStyle}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                          background: row.region === 'AMER' ? 'rgba(246,130,31,0.1)' : row.region === 'EMEA' ? 'rgba(59,130,246,0.1)' : row.region === 'APAC' ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.1)',
                          color: row.region === 'AMER' ? '#F6821F' : row.region === 'EMEA' ? '#3B82F6' : row.region === 'APAC' ? '#10B981' : '#8B5CF6',
                        }}>{row.region}</span>
                      </td>
                      <td style={tdStyle}>{row.department}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
              No employee data available. Add employees in the Admin panel.
            </div>
          )}
        </div>
      )}

      {/* Skills Gap Tab */}
      {activeTab === 'skills-gap' && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Skills Gap Analysis</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Distribution of skill levels across the team. Lower averages indicate areas for focused training.
          </p>
          {skillsGap.length > 0 ? (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Skill</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>L1</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>L2</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>L3</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>L4</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>L5</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Avg</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Assessed</th>
                  </tr>
                </thead>
                <tbody>
                  {skillsGap.filter((s: any) => s.total_assessed > 0).map((row: any, i: number) => {
                    const avgColor = row.avg_level < 2 ? '#EF4444' : row.avg_level < 3 ? '#F59E0B' : row.avg_level < 4 ? '#3B82F6' : '#10B981';
                    return (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontSize: '12px', color: 'var(--text-tertiary)' }}>{row.category_name}</td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{row.skill_name}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: row.level_1 > 0 ? '#EF4444' : 'var(--text-tertiary)' }}>{row.level_1 || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: row.level_2 > 0 ? '#F59E0B' : 'var(--text-tertiary)' }}>{row.level_2 || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: row.level_3 > 0 ? '#3B82F6' : 'var(--text-tertiary)' }}>{row.level_3 || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: row.level_4 > 0 ? '#8B5CF6' : 'var(--text-tertiary)' }}>{row.level_4 || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: row.level_5 > 0 ? '#10B981' : 'var(--text-tertiary)' }}>{row.level_5 || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, background: `${avgColor}15`, color: avgColor }}>
                            {row.avg_level}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-tertiary)' }}>{row.total_assessed}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
              No skill assessment data yet. SEs need to complete their self-assessments first.
            </div>
          )}
        </div>
      )}

      {/* Skills by Team Tab */}
      {activeTab === 'skills-by-team' && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Average Skill Levels by Department</h3>
          {skillsByTeam.length > 0 ? (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Department</th>
                    <th style={thStyle}>Skill</th>
                    <th style={thStyle}>Category</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Avg Level</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>SEs Assessed</th>
                  </tr>
                </thead>
                <tbody>
                  {skillsByTeam.map((row: any, i: number) => {
                    const avgColor = row.avg_level < 2 ? '#EF4444' : row.avg_level < 3 ? '#F59E0B' : row.avg_level < 4 ? '#3B82F6' : '#10B981';
                    return (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{row.department}</td>
                        <td style={tdStyle}>{row.skill_name}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-tertiary)', fontSize: '12px' }}>{row.category_name}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, background: `${avgColor}15`, color: avgColor }}>
                            {row.avg_level}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-tertiary)' }}>{row.assessed_count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
              No data available. Requires employees with departments and completed skill assessments.
            </div>
          )}
        </div>
      )}

      {/* Course Progress Tab */}
      {activeTab === 'course-progress' && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Course Completion by Manager</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Tracks mandatory course completion for each manager's direct reports.
          </p>
          {courseByManager.length > 0 ? (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Manager</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Direct Reports</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Completed</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>In Progress</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Total Recommended</th>
                  </tr>
                </thead>
                <tbody>
                  {courseByManager.map((row: any, i: number) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{row.manager_name}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{row.direct_reports}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#10B981', fontWeight: 600 }}>{row.completed_courses}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#F59E0B', fontWeight: 600 }}>{row.in_progress_courses}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-tertiary)' }}>{row.total_recommended}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
              No data available. Requires employees with manager relationships and course tracking.
            </div>
          )}
        </div>
      )}

      {/* Onboarding Tab */}
      {activeTab === 'onboarding' && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>New Hire Onboarding Progress (Last 90 Days)</h3>
          {onboarding.length > 0 ? (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Department</th>
                    <th style={thStyle}>Start Date</th>
                    <th style={thStyle}>Region</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Skills Assessed</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Courses Done</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>In Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {onboarding.map((row: any, i: number) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{row.name}</td>
                      <td style={{ ...tdStyle, fontSize: '12px' }}>{row.title}</td>
                      <td style={{ ...tdStyle, fontSize: '12px', color: 'var(--text-secondary)' }}>{row.department || '-'}</td>
                      <td style={{ ...tdStyle, fontSize: '12px' }}>{row.start_date}</td>
                      <td style={tdStyle}>
                        {row.region ? (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{row.region}</span>
                        ) : '-'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{ color: row.skills_assessed > 0 ? '#10B981' : 'var(--text-tertiary)', fontWeight: 600 }}>
                          {row.skills_assessed}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#10B981', fontWeight: 600 }}>{row.completed_courses}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#F59E0B', fontWeight: 600 }}>{row.in_progress_courses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
              No new hires in the last 90 days, or employees don't have start dates set.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
