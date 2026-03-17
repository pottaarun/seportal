import { useState, useEffect, useMemo } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";

export function meta() {
  return [
    { title: "Skills Matrix - SolutionHub" },
    { name: "description", content: "SE Skills self-assessment and university course recommendations" },
  ];
}

// Skill level definitions
const SKILL_LEVELS = [
  { value: 1, label: "No Exposure", color: "#6B7280", description: "Have not worked with this technology" },
  { value: 2, label: "Awareness", color: "#F59E0B", description: "Basic understanding of concepts" },
  { value: 3, label: "Working Knowledge", color: "#3B82F6", description: "Can demo and discuss confidently" },
  { value: 4, label: "Deep Expertise", color: "#8B5CF6", description: "Can architect solutions and handle objections" },
  { value: 5, label: "SME", color: "#10B981", description: "Subject Matter Expert - go-to person" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#10B981',
  intermediate: '#3B82F6',
  advanced: '#8B5CF6',
  expert: '#EF4444',
};

// Default skill categories and skills for Cloudflare SE roles
const DEFAULT_CATEGORIES = [
  {
    name: "Application Security",
    icon: "🛡️",
    skills: ["WAF / Managed Rules", "DDoS Protection", "Bot Management", "API Shield / API Gateway", "Page Shield", "SSL/TLS & Certificate Management", "Rate Limiting", "Turnstile"],
  },
  {
    name: "Network Services",
    icon: "🌐",
    skills: ["Magic Transit", "Magic WAN", "Magic Firewall", "Argo Smart Routing", "Spectrum", "Load Balancing", "DNS / DNS Firewall", "China Network"],
  },
  {
    name: "Zero Trust / SASE",
    icon: "🔒",
    skills: ["Cloudflare Access", "Gateway (SWG)", "Browser Isolation", "CASB", "DLP", "DEX (Digital Experience)", "WARP Client", "Tunnel (Cloudflared)"],
  },
  {
    name: "Developer Platform",
    icon: "⚡",
    skills: ["Workers", "Pages", "R2 Storage", "D1 Database", "Workers KV", "Durable Objects", "Workers AI", "Vectorize", "Queues", "Hyperdrive"],
  },
  {
    name: "Performance & Reliability",
    icon: "🚀",
    skills: ["CDN / Caching", "Images & Stream", "Waiting Room", "Web Analytics", "Zaraz", "Speed Optimization (Fonts, Early Hints)"],
  },
  {
    name: "Email & Messaging",
    icon: "📧",
    skills: ["Email Routing", "Email Security (Area 1)", "DMARC Management"],
  },
  {
    name: "SE Core Skills",
    icon: "🎯",
    skills: ["Discovery & Qualification", "Technical Presentations", "POC / POV Execution", "Competitive Analysis", "RFP/RFI Response", "Solution Architecture", "Customer Objection Handling", "Cross-Sell / Upsell"],
  },
];

interface SkillCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sort_order: number;
}

interface Skill {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  category_name?: string;
  sort_order: number;
}

interface SkillAssessment {
  id: string;
  user_email: string;
  user_name: string;
  skill_id: string;
  level: number;
  skill_name?: string;
  category_id?: string;
  category_name?: string;
}

interface UniversityCourse {
  id: string;
  title: string;
  description?: string;
  url?: string;
  provider?: string;
  duration?: string;
  difficulty: string;
  skill_id: string;
  skill_name?: string;
  category_name?: string;
  min_level: number;
  max_level: number;
  current_level?: number;
}

export default function SkillsMatrix() {
  const { isAdmin, currentUserEmail, currentUserName } = useAdmin();

  // State
  const [activeTab, setActiveTab] = useState<'assess' | 'curriculum' | 'team' | 'manage'>('assess');
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [allAssessments, setAllAssessments] = useState<SkillAssessment[]>([]);
  const [courses, setCourses] = useState<UniversityCourse[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<UniversityCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Local assessment state (before saving)
  const [localAssessments, setLocalAssessments] = useState<Map<string, number>>(new Map());

  // Admin modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingCourse, setEditingCourse] = useState<UniversityCourse | null>(null);
  const [seedingDefaults, setSeedingDefaults] = useState(false);

  // Form state
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon: '', sort_order: 0 });
  const [skillForm, setSkillForm] = useState({ category_id: '', name: '', description: '', sort_order: 0 });
  const [courseForm, setCourseForm] = useState({
    title: '', description: '', url: '', provider: '', duration: '',
    difficulty: 'beginner', skill_id: '', min_level: 1, max_level: 2
  });

  // Team view filter
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Load data
  useEffect(() => {
    loadData();
  }, [currentUserEmail]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, skills, coursesData] = await Promise.all([
        api.skillCategories.getAll(),
        api.skills.getAll(),
        api.universityCourses.getAll(),
      ]);

      setCategories(Array.isArray(cats) ? cats : []);
      setAllSkills(Array.isArray(skills) ? skills : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);

      // Expand all categories by default
      if (Array.isArray(cats)) {
        setExpandedCategories(new Set(cats.map((c: SkillCategory) => c.id)));
      }

      // Load user assessments
      if (currentUserEmail) {
        const userAssessments = await api.skillAssessments.getForUser(currentUserEmail);
        setAssessments(Array.isArray(userAssessments) ? userAssessments : []);

        // Initialize local assessments map
        const assessMap = new Map<string, number>();
        if (Array.isArray(userAssessments)) {
          userAssessments.forEach((a: SkillAssessment) => assessMap.set(a.skill_id, a.level));
        }
        setLocalAssessments(assessMap);

        // Load recommended courses
        const recommended = await api.universityCourses.getRecommended(currentUserEmail);
        setRecommendedCourses(Array.isArray(recommended) ? recommended : []);
      }

      // Load team assessments if admin
      if (isAdmin) {
        const teamData = await api.skillAssessments.getAll();
        setAllAssessments(Array.isArray(teamData) ? teamData : []);
      }
    } catch (e) {
      console.error('Error loading skills data:', e);
    }
    setLoading(false);
  };

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const grouped = new Map<string, Skill[]>();
    allSkills.forEach(skill => {
      const existing = grouped.get(skill.category_id) || [];
      existing.push(skill);
      grouped.set(skill.category_id, existing);
    });
    return grouped;
  }, [allSkills]);

  // Handle level change
  const handleLevelChange = (skillId: string, level: number) => {
    setLocalAssessments(prev => {
      const next = new Map(prev);
      next.set(skillId, level);
      return next;
    });
    setHasChanges(true);
  };

  // Save assessments
  const saveAssessments = async () => {
    if (!currentUserEmail || !currentUserName) return;
    setSaving(true);
    try {
      const assessmentData = Array.from(localAssessments.entries()).map(([skill_id, level]) => ({
        skill_id, level,
      }));
      await api.skillAssessments.saveBulk(currentUserEmail, currentUserName, assessmentData);
      setHasChanges(false);

      // Reload data to get updated recommendations
      await loadData();
    } catch (e) {
      console.error('Error saving assessments:', e);
      alert('Failed to save assessments');
    }
    setSaving(false);
  };

  // Seed default categories/skills
  const seedDefaults = async () => {
    if (!window.confirm('This will add the default Cloudflare SE skill categories and skills. Continue?')) return;
    setSeedingDefaults(true);
    try {
      for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
        const cat = DEFAULT_CATEGORIES[i];
        const catResult = await api.skillCategories.create({
          name: cat.name, icon: cat.icon, sort_order: i, description: '',
        }) as any;
        for (let j = 0; j < cat.skills.length; j++) {
          await api.skills.create({
            category_id: catResult.id,
            name: cat.skills[j],
            sort_order: j,
          });
        }
      }
      await loadData();
    } catch (e) {
      console.error('Error seeding defaults:', e);
      alert('Failed to seed default skills');
    }
    setSeedingDefaults(false);
  };

  // Delete handlers
  const deleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category and all its skills?')) return;
    await api.skillCategories.delete(id);
    await loadData();
  };

  const deleteSkill = async (id: string) => {
    if (!window.confirm('Delete this skill?')) return;
    await api.skills.delete(id);
    await loadData();
  };

  const deleteCourse = async (id: string) => {
    if (!window.confirm('Delete this course?')) return;
    await api.universityCourses.delete(id);
    await loadData();
  };

  // Category CRUD
  const saveCategory = async () => {
    if (editingCategory) {
      await api.skillCategories.update(editingCategory.id, categoryForm);
    } else {
      await api.skillCategories.create(categoryForm);
    }
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', icon: '', sort_order: 0 });
    await loadData();
  };

  // Skill CRUD
  const saveSkill = async () => {
    if (editingSkill) {
      await api.skills.update(editingSkill.id, skillForm);
    } else {
      await api.skills.create(skillForm);
    }
    setShowSkillModal(false);
    setEditingSkill(null);
    setSkillForm({ category_id: '', name: '', description: '', sort_order: 0 });
    await loadData();
  };

  // Course CRUD
  const saveCourse = async () => {
    if (editingCourse) {
      await api.universityCourses.update(editingCourse.id, courseForm);
    } else {
      await api.universityCourses.create(courseForm);
    }
    setShowCourseModal(false);
    setEditingCourse(null);
    setCourseForm({ title: '', description: '', url: '', provider: '', duration: '', difficulty: 'beginner', skill_id: '', min_level: 1, max_level: 2 });
    await loadData();
  };

  // Toggle category expand
  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compute completion stats
  const completionStats = useMemo(() => {
    const totalSkills = allSkills.length;
    const assessed = Array.from(localAssessments.values()).filter(v => v > 0).length;
    const avgLevel = assessed > 0
      ? Array.from(localAssessments.values()).reduce((a, b) => a + b, 0) / assessed
      : 0;
    return { totalSkills, assessed, avgLevel, percentage: totalSkills > 0 ? Math.round((assessed / totalSkills) * 100) : 0 };
  }, [allSkills, localAssessments]);

  // Team overview data
  const teamOverview = useMemo(() => {
    const userMap = new Map<string, { email: string; name: string; assessments: SkillAssessment[] }>();
    allAssessments.forEach(a => {
      if (!userMap.has(a.user_email)) {
        userMap.set(a.user_email, { email: a.user_email, name: a.user_name, assessments: [] });
      }
      userMap.get(a.user_email)!.assessments.push(a);
    });
    return Array.from(userMap.values());
  }, [allAssessments]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🎯</div>
        <h2>Loading Skills Matrix...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Preparing your assessment</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div>
            <h2>🎯 Skills Matrix</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Self-assess your skills to get personalized university course recommendations
            </p>
          </div>
          {hasChanges && (
            <button
              onClick={saveAssessments}
              disabled={saving}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save Assessment'}
            </button>
          )}
        </div>
      </div>

      {/* Completion Progress */}
      {activeTab === 'assess' && allSkills.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: '600' }}>Assessment Progress</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {completionStats.assessed} / {completionStats.totalSkills} skills rated
              {completionStats.avgLevel > 0 && ` | Avg: ${completionStats.avgLevel.toFixed(1)}`}
            </span>
          </div>
          <div style={{
            height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${completionStats.percentage}%`,
              background: completionStats.percentage === 100
                ? 'linear-gradient(90deg, #10B981, #059669)'
                : 'linear-gradient(90deg, var(--cf-orange), #F59E0B)',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)' }}>
        {[
          { key: 'assess', label: '📝 Self-Assessment', show: true },
          { key: 'curriculum', label: '🎓 My Curriculum', show: true },
          { key: 'team', label: '👥 Team Overview', show: isAdmin },
          { key: 'manage', label: '⚙️ Manage Skills', show: isAdmin },
        ].filter(t => t.show).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className="filter-btn"
            style={{
              padding: '12px 24px',
              borderRadius: '0',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--cf-orange)' : '2px solid transparent',
              marginBottom: '-2px',
              fontWeight: activeTab === tab.key ? '600' : '400',
              color: activeTab === tab.key ? 'var(--cf-orange)' : 'var(--text-secondary)',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======== SELF-ASSESSMENT TAB ======== */}
      {activeTab === 'assess' && (
        <div>
          {categories.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📋</div>
              <h3>No skills configured yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                {isAdmin
                  ? 'Set up skill categories and skills for your team to assess.'
                  : 'Ask an admin to set up the skills matrix.'}
              </p>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button onClick={seedDefaults} disabled={seedingDefaults}
                    style={{ padding: '10px 20px', fontSize: '14px' }}>
                    {seedingDefaults ? 'Seeding...' : 'Load Default Cloudflare Skills'}
                  </button>
                  <button onClick={() => { setActiveTab('manage'); }} className="btn-secondary"
                    style={{ padding: '10px 20px', fontSize: '14px' }}>
                    Configure Manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Skill Level Legend */}
              <div style={{
                display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap',
              }}>
                {SKILL_LEVELS.map(level => (
                  <div key={level.value} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '6px',
                    background: 'var(--bg-secondary)', fontSize: '12px',
                  }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: level.color, flexShrink: 0,
                    }} />
                    <span style={{ fontWeight: '600' }}>{level.value}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{level.label}</span>
                  </div>
                ))}
              </div>

              {/* Categories + Skills */}
              {categories.map(category => {
                const skills = skillsByCategory.get(category.id) || [];
                const isExpanded = expandedCategories.has(category.id);
                const categoryAssessed = skills.filter(s => localAssessments.has(s.id) && (localAssessments.get(s.id) || 0) > 0).length;

                return (
                  <div key={category.id} className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
                    {/* Category header */}
                    <div
                      onClick={() => toggleCategory(category.id)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '1rem 1.25rem', cursor: 'pointer',
                        background: 'var(--bg-secondary)',
                        borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{category.icon || '📁'}</span>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>{category.name}</h3>
                        <span style={{
                          fontSize: '12px', color: 'var(--text-tertiary)',
                          padding: '2px 8px', background: 'var(--bg-tertiary)', borderRadius: '10px',
                        }}>
                          {categoryAssessed}/{skills.length}
                        </span>
                      </div>
                      <span style={{ fontSize: '18px', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                        ▼
                      </span>
                    </div>

                    {/* Skills list */}
                    {isExpanded && (
                      <div>
                        {skills.map((skill, idx) => {
                          const currentLevel = localAssessments.get(skill.id) || 0;
                          return (
                            <div
                              key={skill.id}
                              style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.875rem 1.25rem',
                                borderBottom: idx < skills.length - 1 ? '1px solid var(--border-color)' : 'none',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: '500', fontSize: '14px' }}>{skill.name}</span>
                                {skill.description && (
                                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                                    {skill.description}
                                  </p>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {SKILL_LEVELS.map(level => (
                                  <button
                                    key={level.value}
                                    onClick={() => handleLevelChange(skill.id, level.value)}
                                    title={`${level.label}: ${level.description}`}
                                    style={{
                                      width: '36px', height: '36px',
                                      borderRadius: '8px',
                                      border: currentLevel === level.value
                                        ? `2px solid ${level.color}`
                                        : '2px solid var(--border-color)',
                                      background: currentLevel === level.value
                                        ? `${level.color}20`
                                        : 'var(--bg-tertiary)',
                                      color: currentLevel === level.value
                                        ? level.color
                                        : 'var(--text-tertiary)',
                                      fontWeight: currentLevel === level.value ? '700' : '400',
                                      cursor: 'pointer',
                                      fontSize: '13px',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    {level.value}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Save button at bottom */}
              {hasChanges && (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <button
                    onClick={saveAssessments}
                    disabled={saving}
                    style={{
                      padding: '12px 40px', fontSize: '15px', fontWeight: '600',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      color: 'white', border: 'none', borderRadius: '10px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Saving Assessment...' : 'Save My Assessment'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ======== CURRICULUM TAB ======== */}
      {activeTab === 'curriculum' && (
        <div>
          {assessments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🎓</div>
              <h3>Complete your assessment first</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Rate your skills in the Self-Assessment tab to get personalized course recommendations.
              </p>
              <button onClick={() => setActiveTab('assess')} style={{ padding: '10px 20px', fontSize: '14px' }}>
                Go to Assessment
              </button>
            </div>
          ) : recommendedCourses.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🎉</div>
              <h3>No courses to recommend right now</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                {courses.length === 0
                  ? 'No university courses have been configured yet. Ask an admin to add courses.'
                  : 'Great job! Your current skill levels don\'t match any course targets. You may be ahead of the available curriculum.'}
              </p>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Based on your self-assessment, here are recommended courses to level up your skills.
                Courses are matched to your current proficiency levels.
              </p>

              {/* Group recommended courses by category */}
              {(() => {
                const grouped = new Map<string, UniversityCourse[]>();
                recommendedCourses.forEach(course => {
                  const key = course.category_name || 'Other';
                  const existing = grouped.get(key) || [];
                  existing.push(course);
                  grouped.set(key, existing);
                });
                return Array.from(grouped.entries()).map(([categoryName, catCourses]) => (
                  <div key={categoryName} style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      {categoryName}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                      {catCourses.map(course => (
                        <div key={course.id} className="card" style={{ padding: '1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                            <h4 style={{ margin: 0, fontSize: '15px', flex: 1 }}>{course.title}</h4>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                              background: `${DIFFICULTY_COLORS[course.difficulty] || '#6B7280'}20`,
                              color: DIFFICULTY_COLORS[course.difficulty] || '#6B7280',
                              textTransform: 'capitalize', whiteSpace: 'nowrap', marginLeft: '8px',
                            }}>
                              {course.difficulty}
                            </span>
                          </div>

                          {course.description && (
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>
                              {course.description}
                            </p>
                          )}

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '0.75rem' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                              background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                            }}>
                              Skill: {course.skill_name}
                            </span>
                            {course.current_level && (
                              <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                                background: `${SKILL_LEVELS[course.current_level - 1]?.color || '#6B7280'}20`,
                                color: SKILL_LEVELS[course.current_level - 1]?.color || '#6B7280',
                              }}>
                                Your Level: {course.current_level} - {SKILL_LEVELS[course.current_level - 1]?.label}
                              </span>
                            )}
                            {course.provider && (
                              <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                                background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                              }}>
                                {course.provider}
                              </span>
                            )}
                            {course.duration && (
                              <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                                background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                              }}>
                                {course.duration}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              For levels {course.min_level}-{course.max_level}
                            </span>
                            {course.url && (
                              <a
                                href={course.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '6px 16px', borderRadius: '6px', fontSize: '12px',
                                  fontWeight: '600', textDecoration: 'none',
                                  background: 'var(--cf-orange)', color: 'white',
                                }}
                              >
                                Start Course →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </>
          )}

          {/* All courses section */}
          {courses.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                All Available Courses ({courses.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
                {courses.map(course => (
                  <div key={course.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{course.title}</span>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600',
                        background: `${DIFFICULTY_COLORS[course.difficulty] || '#6B7280'}20`,
                        color: DIFFICULTY_COLORS[course.difficulty] || '#6B7280',
                        textTransform: 'capitalize', whiteSpace: 'nowrap', marginLeft: '8px',
                      }}>
                        {course.difficulty}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {course.skill_name} ({course.category_name}) | Levels {course.min_level}-{course.max_level}
                    </div>
                    {course.url && (
                      <a href={course.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: 'var(--cf-blue)', textDecoration: 'none' }}>
                        Open Course →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======== TEAM OVERVIEW TAB (Admin) ======== */}
      {activeTab === 'team' && isAdmin && (
        <div>
          {teamOverview.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>👥</div>
              <h3>No assessments yet</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Team members haven't completed their skill assessments yet.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  {teamOverview.length} team member{teamOverview.length !== 1 ? 's' : ''} have completed assessments
                </p>
                <select
                  className="form-select"
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Team heatmap table */}
              <div className="card" style={{ padding: 0, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 1, borderRight: '1px solid var(--border-color)' }}>
                        SE Name
                      </th>
                      {allSkills
                        .filter(s => teamFilter === 'all' || s.category_id === teamFilter)
                        .map(skill => (
                          <th key={skill.id} style={{
                            padding: '8px 6px', textAlign: 'center', fontSize: '11px',
                            maxWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            borderBottom: '1px solid var(--border-color)',
                          }} title={skill.name}>
                            {skill.name.length > 12 ? skill.name.substring(0, 12) + '...' : skill.name}
                          </th>
                        ))}
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderLeft: '2px solid var(--border-color)' }}>
                        Avg
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamOverview.map(member => {
                      const memberMap = new Map(member.assessments.map(a => [a.skill_id, a.level]));
                      const filteredSkills = allSkills.filter(s => teamFilter === 'all' || s.category_id === teamFilter);
                      const levels = filteredSkills.map(s => memberMap.get(s.id) || 0).filter(l => l > 0);
                      const avg = levels.length > 0 ? (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1) : '-';

                      return (
                        <tr key={member.email} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{
                            padding: '8px 12px', fontWeight: '500', whiteSpace: 'nowrap',
                            position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1,
                            borderRight: '1px solid var(--border-color)',
                          }}>
                            {member.name}
                          </td>
                          {filteredSkills.map(skill => {
                            const level = memberMap.get(skill.id) || 0;
                            const levelInfo = SKILL_LEVELS[level - 1];
                            return (
                              <td key={skill.id} style={{ padding: '4px', textAlign: 'center' }}>
                                {level > 0 ? (
                                  <div
                                    title={`${skill.name}: ${levelInfo?.label || 'N/A'}`}
                                    style={{
                                      width: '28px', height: '28px', borderRadius: '6px',
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      background: `${levelInfo?.color || '#6B7280'}25`,
                                      color: levelInfo?.color || '#6B7280',
                                      fontWeight: '600', fontSize: '12px',
                                    }}
                                  >
                                    {level}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>-</span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{
                            padding: '8px 12px', textAlign: 'center', fontWeight: '600',
                            borderLeft: '2px solid var(--border-color)',
                          }}>
                            {avg}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Skill gap summary */}
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Skill Gap Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  {allSkills
                    .filter(s => teamFilter === 'all' || s.category_id === teamFilter)
                    .map(skill => {
                      const levels = teamOverview
                        .map(m => m.assessments.find(a => a.skill_id === skill.id)?.level || 0)
                        .filter(l => l > 0);
                      const avg = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
                      const assessed = levels.length;

                      return (
                        <div key={skill.id} style={{
                          padding: '0.75rem 1rem',
                          background: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          borderLeft: `3px solid ${avg >= 4 ? '#10B981' : avg >= 3 ? '#3B82F6' : avg >= 2 ? '#F59E0B' : '#EF4444'}`,
                        }}>
                          <div style={{ fontWeight: '500', fontSize: '13px', marginBottom: '4px' }}>{skill.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              Avg: {avg > 0 ? avg.toFixed(1) : 'N/A'} | {assessed} rated
                            </span>
                            <div style={{
                              width: '50px', height: '6px', background: 'var(--bg-tertiary)',
                              borderRadius: '3px', overflow: 'hidden',
                            }}>
                              <div style={{
                                height: '100%', width: `${(avg / 5) * 100}%`,
                                background: avg >= 4 ? '#10B981' : avg >= 3 ? '#3B82F6' : avg >= 2 ? '#F59E0B' : '#EF4444',
                                borderRadius: '3px',
                              }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======== MANAGE SKILLS TAB (Admin) ======== */}
      {activeTab === 'manage' && isAdmin && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button onClick={seedDefaults} disabled={seedingDefaults}
              className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              {seedingDefaults ? 'Seeding...' : 'Seed Default Skills'}
            </button>
            <button onClick={() => {
              setCategoryForm({ name: '', description: '', icon: '', sort_order: categories.length });
              setEditingCategory(null);
              setShowCategoryModal(true);
            }} style={{ padding: '8px 16px', fontSize: '13px' }}>
              + Add Category
            </button>
            <button onClick={() => {
              setSkillForm({ category_id: categories[0]?.id || '', name: '', description: '', sort_order: 0 });
              setEditingSkill(null);
              setShowSkillModal(true);
            }} style={{ padding: '8px 16px', fontSize: '13px' }} disabled={categories.length === 0}>
              + Add Skill
            </button>
            <button onClick={() => {
              setCourseForm({ title: '', description: '', url: '', provider: '', duration: '', difficulty: 'beginner', skill_id: allSkills[0]?.id || '', min_level: 1, max_level: 2 });
              setEditingCourse(null);
              setShowCourseModal(true);
            }} style={{ padding: '8px 16px', fontSize: '13px' }} disabled={allSkills.length === 0}>
              + Add Course
            </button>
          </div>

          {/* Categories & Skills */}
          <h3 style={{ marginBottom: '1rem' }}>Categories & Skills ({categories.length} categories, {allSkills.length} skills)</h3>
          {categories.map(category => {
            const skills = skillsByCategory.get(category.id) || [];
            return (
              <div key={category.id} className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: skills.length > 0 ? '0.75rem' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{category.icon || '📁'}</span>
                    <span style={{ fontWeight: '600' }}>{category.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>({skills.length} skills)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        setEditingCategory(category);
                        setCategoryForm({ name: category.name, description: category.description || '', icon: category.icon || '', sort_order: category.sort_order });
                        setShowCategoryModal(true);
                      }}
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="btn-danger"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {skills.map(skill => (
                      <div key={skill.id} style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                        background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', gap: '6px',
                      }}>
                        <span>{skill.name}</span>
                        <button
                          onClick={() => {
                            setEditingSkill(skill);
                            setSkillForm({ category_id: skill.category_id, name: skill.name, description: skill.description || '', sort_order: skill.sort_order });
                            setShowSkillModal(true);
                          }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--cf-blue)', fontSize: '11px', padding: '0 2px',
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteSkill(skill.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#EF4444', fontSize: '11px', padding: '0 2px',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Courses */}
          <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>University Courses ({courses.length})</h3>
          {courses.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No courses configured yet. Add courses to map them to skill levels.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
              {courses.map(course => (
                <div key={course.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{course.title}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => {
                          setEditingCourse(course);
                          setCourseForm({
                            title: course.title, description: course.description || '', url: course.url || '',
                            provider: course.provider || '', duration: course.duration || '',
                            difficulty: course.difficulty, skill_id: course.skill_id,
                            min_level: course.min_level, max_level: course.max_level,
                          });
                          setShowCourseModal(true);
                        }}
                        className="btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="btn-danger"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {course.skill_name} ({course.category_name}) | {course.difficulty} | Levels {course.min_level}-{course.max_level}
                    {course.provider && ` | ${course.provider}`}
                    {course.duration && ` | ${course.duration}`}
                  </div>
                  {course.url && (
                    <a href={course.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: 'var(--cf-blue)', textDecoration: 'none' }}>
                      {course.url}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======== MODALS ======== */}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>x</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveCategory(); }}>
              <div className="form-group">
                <label>Name *</label>
                <input className="form-input" value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g., Application Security" required />
              </div>
              <div className="form-group">
                <label>Icon (emoji)</label>
                <input className="form-input" value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  placeholder="e.g., 🛡️" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input className="form-input" value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Optional description" />
              </div>
              <div className="form-group">
                <label>Sort Order</label>
                <input className="form-input" type="number" value={categoryForm.sort_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                <button type="submit" disabled={!categoryForm.name}>{editingCategory ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Skill Modal */}
      {showSkillModal && (
        <div className="modal-overlay" onClick={() => setShowSkillModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSkill ? 'Edit Skill' : 'Add Skill'}</h3>
              <button className="modal-close" onClick={() => setShowSkillModal(false)}>x</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveSkill(); }}>
              <div className="form-group">
                <label>Category *</label>
                <select className="form-select" value={skillForm.category_id}
                  onChange={(e) => setSkillForm({ ...skillForm, category_id: e.target.value })} required>
                  <option value="">Select category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Skill Name *</label>
                <input className="form-input" value={skillForm.name}
                  onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                  placeholder="e.g., WAF / Managed Rules" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input className="form-input" value={skillForm.description}
                  onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                  placeholder="Optional description" />
              </div>
              <div className="form-group">
                <label>Sort Order</label>
                <input className="form-input" type="number" value={skillForm.sort_order}
                  onChange={(e) => setSkillForm({ ...skillForm, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowSkillModal(false)}>Cancel</button>
                <button type="submit" disabled={!skillForm.name || !skillForm.category_id}>{editingSkill ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingCourse ? 'Edit Course' : 'Add University Course'}</h3>
              <button className="modal-close" onClick={() => setShowCourseModal(false)}>x</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveCourse(); }}>
              <div className="form-group">
                <label>Course Title *</label>
                <input className="form-input" value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="e.g., Cloudflare WAF Deep Dive" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-input" value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Course description" rows={2}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div className="form-group">
                <label>Course URL</label>
                <input className="form-input" value={courseForm.url}
                  onChange={(e) => setCourseForm({ ...courseForm, url: e.target.value })}
                  placeholder="https://university.cloudflare.com/..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Provider</label>
                  <input className="form-input" value={courseForm.provider}
                    onChange={(e) => setCourseForm({ ...courseForm, provider: e.target.value })}
                    placeholder="e.g., Cloudflare University" />
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <input className="form-input" value={courseForm.duration}
                    onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                    placeholder="e.g., 2 hours" />
                </div>
              </div>
              <div className="form-group">
                <label>Maps to Skill *</label>
                <select className="form-select" value={courseForm.skill_id}
                  onChange={(e) => setCourseForm({ ...courseForm, skill_id: e.target.value })} required>
                  <option value="">Select skill...</option>
                  {categories.map(cat => (
                    <optgroup key={cat.id} label={`${cat.icon || ''} ${cat.name}`}>
                      {(skillsByCategory.get(cat.id) || []).map(skill => (
                        <option key={skill.id} value={skill.id}>{skill.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Difficulty *</label>
                  <select className="form-select" value={courseForm.difficulty}
                    onChange={(e) => setCourseForm({ ...courseForm, difficulty: e.target.value })}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Min Level (target)</label>
                  <select className="form-select" value={courseForm.min_level}
                    onChange={(e) => setCourseForm({ ...courseForm, min_level: parseInt(e.target.value) })}>
                    {SKILL_LEVELS.map(l => (
                      <option key={l.value} value={l.value}>{l.value} - {l.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Max Level (target)</label>
                  <select className="form-select" value={courseForm.max_level}
                    onChange={(e) => setCourseForm({ ...courseForm, max_level: parseInt(e.target.value) })}>
                    {SKILL_LEVELS.map(l => (
                      <option key={l.value} value={l.value}>{l.value} - {l.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '-8px' }}>
                This course will be recommended to SEs whose level for the selected skill falls between min and max.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCourseModal(false)}>Cancel</button>
                <button type="submit" disabled={!courseForm.title || !courseForm.skill_id}>{editingCourse ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
