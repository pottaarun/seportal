import { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { api } from "../lib/api";
import { LocationAutocomplete } from "../components/LocationAutocomplete";

export function meta() {
  return [
    { title: "Admin - SolutionHub" },
    { name: "description", content: "Manage administrators and groups" },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// DayDrilldown — expandable panel under a daily-trend row in Page Views.
// Shows headline counts, per-user breakdown (with pages they touched), the
// per-page summary, and the chronological timeline. The user can click any
// row in the per-user list to bounce into the existing user drill-down.
// ──────────────────────────────────────────────────────────────────────────────
function DayDrilldown({ date, loading, stats, onPickUser }: {
  date: string;
  loading: boolean;
  stats: any | null;
  onPickUser: (email: string) => void;
}) {
  if (loading) {
    return (
      <div style={{ padding: '14px 14px 8px 32px', color: 'var(--text-tertiary)', fontSize: 13 }}>
        Loading {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}…
      </div>
    );
  }
  if (!stats) return null;

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const initials = (s: string) => (s || '?').split(/[ .@_-]+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
  const pretty = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div style={{
      margin: '6px 0 10px 32px',
      padding: '14px 16px',
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border-color)',
      borderRadius: 8,
    }}>
      {/* Headline */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
        paddingBottom: 10, marginBottom: 12,
        borderBottom: '1px solid var(--border-color)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{pretty}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{stats.total_views}</strong> total views
          {' · '}
          <strong style={{ color: 'var(--text-primary)' }}>{stats.unique_users}</strong> unique {stats.unique_users === 1 ? 'user' : 'users'}
          {' · '}
          <strong style={{ color: 'var(--text-primary)' }}>{(stats.by_page || []).length}</strong> distinct pages
        </span>
      </div>

      {(stats.by_user || []).length === 0 && (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13, margin: 0 }}>No views recorded for this day.</p>
      )}

      {/* Two-column grid: who (left) + what page (right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
        gap: 16,
      }}>
        {/* Left: users with their per-page breakdown */}
        {(stats.by_user || []).length > 0 && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              color: 'var(--text-tertiary)', textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              Who viewed (click for full history)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.by_user.map((u: any) => (
                <div
                  key={u.user_email}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                  }}
                >
                  <button
                    onClick={() => onPickUser(u.user_email)}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: 0, background: 'transparent', border: 'none',
                      cursor: 'pointer', color: 'inherit', textAlign: 'left',
                    }}
                    title={`Open ${u.user_email}'s full history`}
                    type="button"
                  >
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--cf-orange), var(--cf-blue, #4F8BF5))',
                      color: '#fff',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>{initials(u.user_name || u.user_email)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.user_name || u.user_email}
                      </span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {u.view_count} views · {u.pages_visited} pages · {formatTime(u.first_view)}–{formatTime(u.last_view)}
                      </span>
                    </span>
                  </button>
                  {/* Pages this user touched today */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, paddingLeft: 36 }}>
                    {(u.pages || []).slice(0, 12).map((p: any) => (
                      <span
                        key={p.page_path}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 9999,
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          fontSize: 11, color: 'var(--text-secondary)',
                        }}
                        title={`${p.page_path} · ${p.count} ${p.count === 1 ? 'view' : 'views'} · last at ${formatTime(p.last_viewed)}`}
                      >
                        <span style={{ color: 'var(--text-primary)' }}>{p.page_label || p.page_path}</span>
                        <span style={{ opacity: 0.7 }}>×{p.count}</span>
                      </span>
                    ))}
                    {(u.pages || []).length > 12 && (
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', alignSelf: 'center' }}>
                        +{u.pages.length - 12} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right: per-page summary (which pages were hot today) */}
        {(stats.by_page || []).length > 0 && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              color: 'var(--text-tertiary)', textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              What pages
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {stats.by_page.map((p: any) => (
                <div key={p.page_path} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.page_path}>
                    <strong style={{ color: 'var(--text-primary)' }}>{p.page_label || p.page_path}</strong>
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: 6, fontSize: 11 }}>{p.page_path}</span>
                  </span>
                  <span style={{ flexShrink: 0, color: 'var(--text-secondary)', fontSize: 11 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{p.view_count}</strong>
                    <span style={{ opacity: 0.7 }}>{' · '}{p.unique_users} {p.unique_users === 1 ? 'user' : 'users'}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeline (last) */}
      {(stats.timeline || []).length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            color: 'var(--text-tertiary)', textTransform: 'uppercase',
            cursor: 'pointer', userSelect: 'none',
          }}>
            Chronological timeline ({stats.timeline.length} {stats.timeline.length === 500 ? 'shown, capped at 500' : 'events'})
          </summary>
          <div style={{
            marginTop: 8,
            maxHeight: 280, overflowY: 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 11,
          }}>
            {stats.timeline.map((t: any, i: number) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '64px minmax(0, 1.4fr) minmax(0, 1fr)',
                gap: 10,
                padding: '4px 10px',
                borderBottom: i < stats.timeline.length - 1 ? '1px solid var(--border-color)' : 'none',
                color: 'var(--text-secondary)',
              }}>
                <span style={{ color: 'var(--text-tertiary)' }}>{formatTime(t.viewed_at)}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                  {t.user_name || t.user_email}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.page_path}>
                  {t.page_label || t.page_path}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
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
    members: [] as string[],
    admins: [] as string[]
  });
  const [memberEmail, setMemberEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // Products state
  const [products, setProducts] = useState<any[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: ""
  });

  // Employees state
  const [employees, setEmployees] = useState<any[]>([]);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    title: "",
    department: "",
    managerId: "",
    bio: "",
    location: "",
    region: "",
    startDate: ""
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Page Views state
  const [pageViewStats, setPageViewStats] = useState<any>(null);
  const [pageViewDays, setPageViewDays] = useState(30);
  const [loadingPageViews, setLoadingPageViews] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loadingUserStats, setLoadingUserStats] = useState(false);
  // Per-day drill-down: which date is open + cached payload
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayStats, setDayStats] = useState<any>(null);
  const [loadingDayStats, setLoadingDayStats] = useState(false);

  // Error Logs state
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [errorFilter, setErrorFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  // Workday Integration state
  const [workdayConfig, setWorkdayConfig] = useState<any>({
    tenant_url: '', client_id: '', client_secret: '', refresh_token: '',
    sync_enabled: false, sync_interval_hours: 24,
  });
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  useEffect(() => {
    if (activeTab === "groups") {
      loadGroups();
    } else if (activeTab === "products") {
      loadProducts();
    } else if (activeTab === "employees") {
      loadEmployees();
    } else if (activeTab === "integrations") {
      loadWorkdayData();
    } else if (activeTab === "page-views") {
      loadPageViewStats();
    } else if (activeTab === "error-logs") {
      loadErrorLogs();
    }
  }, [activeTab]);

  const loadPageViewStats = async (days?: number) => {
    setLoadingPageViews(true);
    try {
      const data = await api.pageViews.getStats(days ?? pageViewDays);
      setPageViewStats(data);
    } catch (e) {
      console.error('Error loading page view stats:', e);
    }
    setLoadingPageViews(false);
  };

  const loadUserStats = async (email: string) => {
    setSelectedUser(email);
    setLoadingUserStats(true);
    setUserStats(null);
    try {
      const data = await api.pageViews.getUserStats(email, pageViewDays);
      setUserStats(data);
    } catch (e) {
      console.error('Error loading user stats:', e);
    }
    setLoadingUserStats(false);
  };

  // Toggle and lazy-load the drill-down for a given calendar date.
  const loadDayStats = async (date: string) => {
    if (selectedDay === date) {
      // Clicking the open day collapses it.
      setSelectedDay(null);
      setDayStats(null);
      return;
    }
    setSelectedDay(date);
    setLoadingDayStats(true);
    setDayStats(null);
    try {
      const data = await api.pageViews.getDayStats(date);
      setDayStats(data);
    } catch (e) {
      console.error('Error loading day stats:', e);
    }
    setLoadingDayStats(false);
  };

  const loadErrorLogs = async (filter?: 'all' | 'unresolved' | 'resolved') => {
    setLoadingErrors(true);
    try {
      const f = filter ?? errorFilter;
      const resolved = f === 'all' ? undefined : f === 'resolved' ? 1 : 0;
      const data = await api.errorLogs.getAll(200, resolved);
      setErrorLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading error logs:', e);
    }
    setLoadingErrors(false);
  };

  const handleResolveError = async (id: number) => {
    try {
      await api.errorLogs.resolve(id);
      setErrorLogs(prev => prev.map(e => e.id === id ? { ...e, resolved: 1 } : e));
    } catch (e) {
      console.error('Error resolving log:', e);
    }
  };

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
        admins: newGroup.admins,
        createdAt: new Date().toISOString()
      };
      await api.groups.create(groupData);
      await loadGroups();
      setShowGroupModal(false);
      setNewGroup({ name: "", description: "", members: [], admins: [] });
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
        members: newGroup.members,
        admins: newGroup.admins
      });
      await loadGroups();
      setShowGroupModal(false);
      setEditingGroup(null);
      setNewGroup({ name: "", description: "", members: [], admins: [] });
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
      members: newGroup.members.filter(m => m !== email),
      // Also remove from admins if they were an admin
      admins: newGroup.admins.filter(a => a !== email)
    });
  };

  const handleAddGroupAdmin = () => {
    if (adminEmail && !newGroup.admins.includes(adminEmail)) {
      // Add to admins list
      const updatedAdmins = [...newGroup.admins, adminEmail];
      // Also ensure they're in members list
      const updatedMembers = newGroup.members.includes(adminEmail)
        ? newGroup.members
        : [...newGroup.members, adminEmail];

      setNewGroup({
        ...newGroup,
        admins: updatedAdmins,
        members: updatedMembers
      });
      setAdminEmail("");
    }
  };

  const handleRemoveGroupAdmin = (email: string) => {
    setNewGroup({ ...newGroup, admins: newGroup.admins.filter(a => a !== email) });
  };

  const openEditGroup = (group: any) => {
    setEditingGroup(group);
    setNewGroup({
      name: group.name,
      description: group.description,
      members: group.members || [],
      admins: group.admins || []
    });
    setShowGroupModal(true);
  };

  const openNewGroup = () => {
    setEditingGroup(null);
    setNewGroup({ name: "", description: "", members: [], admins: [] });
    setShowGroupModal(true);
  };

  // Product management functions
  const loadProducts = async () => {
    try {
      const data = await api.products.getAll();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading products:', e);
      setProducts([]);
    }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name.trim()) {
      alert("Product name is required");
      return;
    }

    try {
      if (editingProduct) {
        await api.products.update(editingProduct.id, newProduct);
      } else {
        await api.products.create({
          id: Date.now().toString(),
          ...newProduct
        });
      }
      setShowProductModal(false);
      setNewProduct({ name: "", description: "" });
      setEditingProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await api.products.delete(id);
        loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
      }
    }
  };

  const openEditProduct = (product: any) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      description: product.description || ""
    });
    setShowProductModal(true);
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setNewProduct({ name: "", description: "" });
    setShowProductModal(true);
  };

  // Workday integration functions
  const loadWorkdayData = async () => {
    try {
      const [config, status, logs] = await Promise.all([
        api.workday.getConfig(),
        api.workday.getSyncStatus(),
        api.workday.getSyncLogs(),
      ]);
      if (config) setWorkdayConfig({ ...workdayConfig, ...config });
      if (status) setSyncStatus(status);
      if (Array.isArray(logs)) setSyncLogs(logs);
    } catch (e) {
      console.error('Error loading Workday data:', e);
    }
  };

  const handleSaveWorkdayConfig = async () => {
    setSavingConfig(true);
    setConfigSaved(false);
    try {
      await api.workday.saveConfig(workdayConfig);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (e) {
      console.error('Error saving config:', e);
      alert('Failed to save configuration');
    }
    setSavingConfig(false);
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      const result = await api.workday.triggerSync();
      alert(result.message || 'Sync triggered');
      await loadWorkdayData();
    } catch (e) {
      console.error('Error triggering sync:', e);
      alert('Failed to trigger sync');
    }
    setSyncing(false);
  };

  // Employee management functions
  const loadEmployees = async () => {
    try {
      const data = await api.employees.getAll();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading employees:', e);
      setEmployees([]);
    }
  };

  const handleSaveEmployee = async () => {
    if (!newEmployee.name.trim() || !newEmployee.email.trim() || !newEmployee.title.trim()) {
      alert("Name, email, and title are required");
      return;
    }

    try {
      const employeeId = editingEmployee?.id || Date.now().toString();

      if (editingEmployee) {
        await api.employees.update(employeeId, newEmployee);
      } else {
        await api.employees.create({
          id: employeeId,
          ...newEmployee
        });
      }

      // Upload photo if provided
      if (photoFile) {
        await api.employees.uploadPhoto(employeeId, photoFile);
      }

      setShowEmployeeModal(false);
      setNewEmployee({ name: "", email: "", title: "", department: "", managerId: "", bio: "", location: "", region: "", startDate: "" });
      setEditingEmployee(null);
      setPhotoFile(null);
      loadEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Failed to save employee');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        await api.employees.delete(id);
        loadEmployees();
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Failed to delete employee');
      }
    }
  };

  const openEditEmployee = (employee: any) => {
    setEditingEmployee(employee);
    setNewEmployee({
      name: employee.name,
      email: employee.email,
      title: employee.title,
      department: employee.department || "",
      managerId: employee.manager_id || "",
      bio: employee.bio || "",
      location: employee.location || "",
      region: employee.region || "",
      startDate: employee.start_date || ""
    });
    setPhotoFile(null);
    setShowEmployeeModal(true);
  };

  const openNewEmployee = () => {
    setEditingEmployee(null);
    setNewEmployee({ name: "", email: "", title: "", department: "", managerId: "", bio: "", location: "", region: "", startDate: "" });
    setPhotoFile(null);
    setShowEmployeeModal(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2>Admin Panel</h2>
          <p>Manage administrators, groups, products, and employees</p>
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
        {activeTab === "products" && (
          <button onClick={openNewProduct}>
            + Add Product
          </button>
        )}
        {activeTab === "employees" && (
          <button onClick={openNewEmployee}>
            + Add Employee
          </button>
        )}
        {activeTab === "integrations" && (
          <button onClick={handleTriggerSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Now'}
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
        <button
          onClick={() => setActiveTab("products")}
          style={{
            padding: '1rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === "products" ? '3px solid var(--cf-orange)' : '3px solid transparent',
            color: activeTab === "products" ? 'var(--cf-orange)' : 'var(--text-secondary)',
            fontWeight: activeTab === "products" ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab("employees")}
          style={{
            padding: '1rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === "employees" ? '3px solid var(--cf-orange)' : '3px solid transparent',
            color: activeTab === "employees" ? 'var(--cf-orange)' : 'var(--text-secondary)',
            fontWeight: activeTab === "employees" ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Employees
        </button>
        <button
          onClick={() => setActiveTab("integrations")}
          style={{
            padding: '1rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === "integrations" ? '3px solid var(--cf-orange)' : '3px solid transparent',
            color: activeTab === "integrations" ? 'var(--cf-orange)' : 'var(--text-secondary)',
            fontWeight: activeTab === "integrations" ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Integrations
        </button>
        <button
          onClick={() => setActiveTab("page-views")}
          style={{
            padding: '1rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === "page-views" ? '3px solid var(--cf-orange)' : '3px solid transparent',
            color: activeTab === "page-views" ? 'var(--cf-orange)' : 'var(--text-secondary)',
            fontWeight: activeTab === "page-views" ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Page Views
        </button>
        <button
          onClick={() => setActiveTab("error-logs")}
          style={{
            padding: '1rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === "error-logs" ? '3px solid var(--cf-orange)' : '3px solid transparent',
            color: activeTab === "error-logs" ? 'var(--cf-orange)' : 'var(--text-secondary)',
            fontWeight: activeTab === "error-logs" ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Error Logs
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
                          group.members.map((member: string) => {
                            const isGroupAdmin = group.admins && group.admins.includes(member);
                            return (
                              <span
                                key={member}
                                style={{
                                  padding: '4px 12px',
                                  background: isGroupAdmin ? 'rgba(246, 130, 31, 0.1)' : 'var(--bg-tertiary)',
                                  borderRadius: '20px',
                                  fontSize: '0.75rem',
                                  border: isGroupAdmin ? '1px solid var(--cf-orange)' : '1px solid var(--border-color)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                {member}
                                {isGroupAdmin && (
                                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--cf-orange)' }}>
                                    ADMIN
                                  </span>
                                )}
                              </span>
                            );
                          })
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

              <div className="form-group">
                <label htmlFor="groupAdminEmail">Group Admins</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
                  Group admins have elevated permissions to manage group content and settings.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    id="groupAdminEmail"
                    type="email"
                    className="form-input"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@cloudflare.com"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddGroupAdmin}
                    className="btn-secondary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    + Add Admin
                  </button>
                </div>
                {newGroup.admins.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {newGroup.admins.map((admin) => (
                      <div
                        key={admin}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'rgba(246, 130, 31, 0.1)',
                          border: '1px solid var(--cf-orange)',
                          borderRadius: '8px',
                          fontSize: '0.875rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{admin}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', background: 'var(--cf-orange)', color: 'white', borderRadius: '4px' }}>
                            ADMIN
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveGroupAdmin(admin)}
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

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="card">
          <h3>Products</h3>
          {products.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
              No products yet. Click "+ Add Product" to create one.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {products.map((product: any) => (
                <div
                  key={product.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{product.name}</div>
                    {product.description && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {product.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => openEditProduct(product)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        border: '1px solid var(--cf-orange)',
                        color: 'var(--cf-orange)',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        border: '1px solid var(--error)',
                        color: 'var(--error)',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveProduct();
            }}>
              <h3>{editingProduct ? 'Edit Product' : 'Add Product'}</h3>

              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  required
                  placeholder="e.g., Workers, Pages, R2, D1"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Optional description of the product"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowProductModal(false)}>
                  Cancel
                </button>
                <button type="submit">
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === "employees" && (
        <div className="card">
          <h3>Employees</h3>
          {employees.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
              No employees yet. Click "+ Add Employee" to create one.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {employees.map((employee: any) => (
                <div
                  key={employee.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{employee.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {employee.title} {employee.department && `• ${employee.department}`}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                      {employee.email}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => openEditEmployee(employee)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        border: '1px solid var(--cf-orange)',
                        color: 'var(--cf-orange)',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(employee.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        border: '1px solid var(--error)',
                        color: 'var(--error)',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="modal-overlay" onClick={() => setShowEmployeeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveEmployee();
            }}>
              <h3>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h3>

              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  required
                  placeholder="Full Name"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  required
                  placeholder="email@company.com"
                />
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={newEmployee.title}
                  onChange={(e) => setNewEmployee({ ...newEmployee, title: e.target.value })}
                  required
                  placeholder="e.g., Senior Sales Engineer"
                />
              </div>

              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                  placeholder="e.g., Sales Engineering"
                />
              </div>

              <div className="form-group">
                <label>Manager</label>
                <select
                  value={newEmployee.managerId}
                  onChange={(e) => setNewEmployee({ ...newEmployee, managerId: e.target.value })}
                >
                  <option value="">-- No Manager --</option>
                  {employees.filter(emp => emp.id !== editingEmployee?.id).map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Location</label>
                <LocationAutocomplete
                  value={newEmployee.location}
                  onChange={(value) => setNewEmployee({ ...newEmployee, location: value })}
                  placeholder="e.g., San Francisco, CA, USA"
                />
              </div>

              <div className="form-group">
                <label>Region</label>
                <select
                  value={newEmployee.region}
                  onChange={(e) => setNewEmployee({ ...newEmployee, region: e.target.value })}
                >
                  <option value="">-- Select Region --</option>
                  <option value="AMER">AMER (Americas)</option>
                  <option value="EMEA">EMEA (Europe, Middle East, Africa)</option>
                  <option value="APAC">APAC (Asia Pacific)</option>
                  <option value="LATAM">LATAM (Latin America)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={newEmployee.startDate}
                  onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={newEmployee.bio}
                  onChange={(e) => setNewEmployee({ ...newEmployee, bio: e.target.value })}
                  placeholder="Brief bio or description"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  style={{ padding: '8px' }}
                />
                {photoFile && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Selected: {photoFile.name}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEmployeeModal(false)}>
                  Cancel
                </button>
                <button type="submit">
                  {editingEmployee ? 'Update Employee' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === "integrations" && (
        <div>
          {/* Workday Connection Status Banner */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: `3px solid ${syncStatus?.last_sync_status === 'placeholder' || syncStatus?.last_sync_status === 'success' ? '#10B981' : syncStatus?.last_sync_at ? '#F59E0B' : '#6B7280'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Workday Integration</h3>
                  <span style={{
                    padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700,
                    background: workdayConfig.sync_enabled ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                    color: workdayConfig.sync_enabled ? '#10B981' : '#6B7280',
                  }}>
                    {workdayConfig.sync_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {syncStatus?.last_sync_at
                    ? `Last synced: ${new Date(syncStatus.last_sync_at).toLocaleString()}`
                    : 'Never synced'}
                  {syncStatus?.last_sync_status && ` (${syncStatus.last_sync_status})`}
                </p>
              </div>
              <button onClick={handleTriggerSync} disabled={syncing}
                style={{ padding: '8px 16px', fontSize: '13px', opacity: syncing ? 0.6 : 1 }}>
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Connection Settings</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Configure your Workday API credentials. Secrets are stored securely in Cloudflare KV and never exposed.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Tenant URL</label>
                <input type="url" className="form-input" value={workdayConfig.tenant_url || ''}
                  onChange={(e) => setWorkdayConfig({ ...workdayConfig, tenant_url: e.target.value })}
                  placeholder="https://wd5.myworkday.com/your-tenant" />
              </div>
              <div className="form-group">
                <label>Client ID</label>
                <input type="text" className="form-input" value={workdayConfig.client_id || ''}
                  onChange={(e) => setWorkdayConfig({ ...workdayConfig, client_id: e.target.value })}
                  placeholder="ISU_xxx or API Client ID" />
              </div>
              <div className="form-group">
                <label>Client Secret</label>
                <input type="password" className="form-input" value={workdayConfig.client_secret || ''}
                  onChange={(e) => setWorkdayConfig({ ...workdayConfig, client_secret: e.target.value })}
                  placeholder="Enter to update (stored in KV)" />
              </div>
              <div className="form-group">
                <label>Refresh Token</label>
                <input type="password" className="form-input" value={workdayConfig.refresh_token || ''}
                  onChange={(e) => setWorkdayConfig({ ...workdayConfig, refresh_token: e.target.value })}
                  placeholder="Enter to update (stored in KV)" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                <input type="checkbox" checked={workdayConfig.sync_enabled || false}
                  onChange={(e) => setWorkdayConfig({ ...workdayConfig, sync_enabled: e.target.checked })}
                  style={{ width: '16px', height: '16px' }} />
                Enable automatic daily sync
              </label>
              <div className="form-group" style={{ margin: 0, flex: '0 0 auto' }}>
                <select className="form-select" value={workdayConfig.sync_interval_hours || 24}
                  onChange={(e) => setWorkdayConfig({ ...workdayConfig, sync_interval_hours: parseInt(e.target.value) })}
                  style={{ padding: '6px 10px', fontSize: '13px' }}>
                  <option value={6}>Every 6 hours</option>
                  <option value={12}>Every 12 hours</option>
                  <option value={24}>Every 24 hours</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '16px' }}>
              <button onClick={handleSaveWorkdayConfig} disabled={savingConfig}
                style={{ padding: '8px 20px', fontSize: '13px', opacity: savingConfig ? 0.6 : 1 }}>
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
              {configSaved && (
                <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 600 }}>Configuration saved</span>
              )}
            </div>
          </div>

          {/* Field Mapping Reference */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Field Mapping</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              How Workday fields map to SolutionHub employee records. These are applied automatically during sync.
            </p>
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--border-color)', background: 'var(--bg-tertiary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>Workday Field</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--border-color)', background: 'var(--bg-tertiary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>Portal Field</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--border-color)', background: 'var(--bg-tertiary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Worker ID', 'workday_id', 'Unique identifier'],
                    ['Preferred Name', 'name', 'Falls back to Legal Name'],
                    ['Work Email', 'email', 'Primary key for linking'],
                    ['Business Title', 'title', ''],
                    ['Supervisory Org', 'department', 'Top-level org name'],
                    ['Manager Worker ID', 'manager_id', 'Resolved via workday_id lookup'],
                    ['Work Address', 'location', 'City, Country'],
                    ['Region', 'region', 'Mapped to AMER/EMEA/APAC/LATAM'],
                    ['Hire Date', 'start_date', ''],
                    ['Cost Center', 'cost_center', 'New field'],
                    ['Business Unit', 'business_unit', 'New field'],
                    ['Job Family', 'job_family', 'New field'],
                    ['Management Level', 'job_level', 'New field'],
                    ['Worker Status', 'employee_status', 'active/inactive/terminated'],
                  ].map(([wd, portal, notes], i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '12px' }}>{wd}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '12px', color: 'var(--cf-blue)' }}>{portal}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)', fontSize: '12px' }}>{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sync Logs */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Sync History</h3>
              <button className="btn-secondary" onClick={loadWorkdayData} style={{ padding: '6px 12px', fontSize: '12px' }}>
                Refresh
              </button>
            </div>
            {syncLogs.length > 0 ? (
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {['Time', 'Type', 'Status', 'Created', 'Updated', 'Deactivated'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--border-color)', background: 'var(--bg-tertiary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.map((log: any) => (
                      <tr key={log.id}>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                          {log.started_at ? new Date(log.started_at).toLocaleString() : '-'}
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: log.sync_type === 'webhook' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)', color: log.sync_type === 'webhook' ? '#6366F1' : '#F59E0B' }}>
                            {log.sync_type || 'manual'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: log.status === 'completed' || log.status === 'placeholder' ? 'rgba(16,185,129,0.1)' : log.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: log.status === 'completed' || log.status === 'placeholder' ? '#10B981' : log.status === 'error' ? '#EF4444' : '#F59E0B' }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>{log.records_created || 0}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>{log.records_updated || 0}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>{log.records_deactivated || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', padding: '2rem 0' }}>
                No sync history yet. Configure your Workday credentials and trigger a sync.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Page Views Tab */}
      {activeTab === "page-views" && (
        <div>
          {/* Period selector */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Tab Visit Analytics</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {pageViewStats ? `${pageViewStats.total_views.toLocaleString()} total views in the last ${pageViewDays} days` : 'Loading...'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={pageViewDays}
                onChange={(e) => {
                  const d = parseInt(e.target.value);
                  setPageViewDays(d);
                  loadPageViewStats(d);
                }}
                style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button className="btn-secondary" onClick={() => loadPageViewStats()} style={{ padding: '6px 12px', fontSize: '12px' }}>
                Refresh
              </button>
            </div>
          </div>

          {loadingPageViews && !pageViewStats && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Loading page view stats...</p>
            </div>
          )}

          {pageViewStats && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Most Visited Tabs */}
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Most Visited Tabs</h3>
                {pageViewStats.by_page && pageViewStats.by_page.length > 0 ? (
                  <div style={{ overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr>
                          {['Rank', 'Tab', 'Path', 'Total Views', 'Unique Users'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--border-color)', background: 'var(--bg-tertiary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageViewStats.by_page.map((row: any, i: number) => {
                          const maxViews = pageViewStats.by_page[0]?.view_count || 1;
                          const pct = Math.round((row.view_count / maxViews) * 100);
                          return (
                            <tr key={row.page_path}>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontWeight: 700, color: i < 3 ? 'var(--cf-orange)' : 'var(--text-primary)' }}>
                                #{i + 1}
                              </td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>
                                {row.page_label || row.page_path}
                              </td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {row.page_path}
                              </td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ flex: 1, height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--cf-orange)', borderRadius: '3px' }} />
                                  </div>
                                  <span style={{ fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>{row.view_count}</span>
                                </div>
                              </td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                                {row.unique_users}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem 0', fontSize: '13px' }}>
                    No page view data yet. Views will appear as users navigate the app.
                  </p>
                )}
              </div>

              {/* Top Users */}
              <div className="card">
                <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Top Users <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>-- click to view details</span></h3>
                {pageViewStats.by_user && pageViewStats.by_user.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {pageViewStats.by_user.map((user: any, i: number) => (
                      <div
                        key={user.user_email}
                        onClick={() => loadUserStats(user.user_email)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          background: selectedUser === user.user_email ? 'rgba(246,130,31,0.06)' : 'var(--bg-tertiary)',
                          borderRadius: '8px',
                          border: selectedUser === user.user_email ? '1px solid var(--cf-orange)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            width: '24px', height: '24px', borderRadius: '50%', fontSize: '11px', fontWeight: 700,
                            background: i < 3 ? 'linear-gradient(135deg, var(--cf-orange), var(--cf-orange-dark))' : 'var(--bg-secondary)',
                            color: i < 3 ? 'white' : 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {i + 1}
                          </span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{user.user_name || 'Unknown'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{user.user_email}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {user.view_count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem 0', fontSize: '13px' }}>
                    No user data yet.
                  </p>
                )}
              </div>

              {/* User Drill-down */}
              {selectedUser && (
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px' }}>
                        {userStats?.by_page?.[0]?.user_name || selectedUser}
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {selectedUser} -- {userStats?.total_views || 0} views in the last {pageViewDays} days
                      </p>
                    </div>
                    <button className="btn-secondary" onClick={() => { setSelectedUser(null); setUserStats(null); }} style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Close
                    </button>
                  </div>

                  {loadingUserStats && (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem 0' }}>Loading...</p>
                  )}

                  {userStats && !loadingUserStats && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {/* Per-user tab breakdown */}
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-secondary)' }}>Most Visited Tabs</h4>
                        {userStats.by_page && userStats.by_page.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {userStats.by_page.map((row: any, i: number) => {
                              const maxViews = userStats.by_page[0]?.view_count || 1;
                              const pct = Math.round((row.view_count / maxViews) * 100);
                              return (
                                <div key={row.page_path} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                                  <span style={{ minWidth: '24px', fontWeight: 700, color: i < 3 ? 'var(--cf-orange)' : 'var(--text-tertiary)', fontSize: '12px' }}>
                                    #{i + 1}
                                  </span>
                                  <span style={{ minWidth: '90px', fontWeight: 500 }}>{row.page_label || row.page_path}</span>
                                  <div style={{ flex: 1, height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--cf-orange)', borderRadius: '3px' }} />
                                  </div>
                                  <span style={{ minWidth: '35px', textAlign: 'right', fontWeight: 600, fontSize: '12px' }}>{row.view_count}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No data.</p>
                        )}
                      </div>

                      {/* Recent activity */}
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-secondary)' }}>Recent Activity</h4>
                        {userStats.recent && userStats.recent.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '260px', overflowY: 'auto' }}>
                            {userStats.recent.map((row: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '4px', background: i % 2 === 0 ? 'var(--bg-tertiary)' : 'transparent', fontSize: '12px' }}>
                                <span style={{ fontWeight: 500 }}>{row.page_label || row.page_path}</span>
                                <span style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '11px' }}>
                                  {new Date(row.viewed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No recent activity.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Daily Trend */}
              <div className="card">
                <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Daily Activity</h3>
                {pageViewStats.daily_trend && pageViewStats.daily_trend.length > 0 ? (() => {
                  // Aggregate daily totals
                  const dailyTotals: Record<string, number> = {};
                  pageViewStats.daily_trend.forEach((row: any) => {
                    dailyTotals[row.date] = (dailyTotals[row.date] || 0) + row.view_count;
                  });
                  const days = Object.entries(dailyTotals)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 14);
                  const maxDay = Math.max(...days.map(([, c]) => c as number));
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        Click a day to see who viewed what →
                      </p>
                      {days.map(([date, count]) => {
                        const isOpen = selectedDay === date;
                        return (
                          <div key={date}>
                            <button
                              onClick={() => loadDayStats(date)}
                              style={{
                                width: '100%',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                fontSize: '13px',
                                padding: '6px 8px',
                                background: isOpen ? 'rgba(79,139,245,0.10)' : 'transparent',
                                border: `1px solid ${isOpen ? 'rgba(79,139,245,0.35)' : 'transparent'}`,
                                borderRadius: 6,
                                cursor: 'pointer',
                                textAlign: 'left',
                                color: 'inherit',
                                transition: 'background 0.15s ease, border-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isOpen) e.currentTarget.style.background = 'var(--bg-tertiary)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isOpen) e.currentTarget.style.background = 'transparent';
                              }}
                              type="button"
                            >
                              <span aria-hidden style={{
                                width: 14, color: 'var(--text-tertiary)', fontSize: 11,
                                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.15s ease',
                              }}>▶</span>
                              <span style={{ minWidth: '80px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>
                                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                              <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.round(((count as number) / maxDay) * 100)}%`, height: '100%', background: 'var(--cf-blue, #4F8BF5)', borderRadius: '4px' }} />
                              </div>
                              <span style={{ minWidth: '30px', textAlign: 'right', fontWeight: 600 }}>{count as number}</span>
                            </button>

                            {isOpen && (
                              <DayDrilldown
                                date={date}
                                loading={loadingDayStats}
                                stats={dayStats}
                                onPickUser={(email) => loadUserStats(email)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })() : (
                  <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem 0', fontSize: '13px' }}>
                    No daily activity data yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Logs Tab */}
      {activeTab === "error-logs" && (
        <div>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Error Logs</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Errors captured from user sessions. Resolve them as you fix issues.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={errorFilter}
                onChange={(e) => {
                  const v = e.target.value as 'all' | 'unresolved' | 'resolved';
                  setErrorFilter(v);
                  loadErrorLogs(v);
                }}
                style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
                <option value="all">All</option>
              </select>
              <button className="btn-secondary" onClick={() => loadErrorLogs()} style={{ padding: '6px 12px', fontSize: '12px' }}>
                Refresh
              </button>
            </div>
          </div>

          {loadingErrors && errorLogs.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Loading error logs...</p>
            </div>
          )}

          {!loadingErrors && errorLogs.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>No {errorFilter !== 'all' ? errorFilter : ''} errors found.</p>
            </div>
          )}

          {errorLogs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {errorLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="card"
                  style={{
                    padding: '14px 16px',
                    borderLeft: `3px solid ${log.resolved ? '#10B981' : '#EF4444'}`,
                    opacity: log.resolved ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                        background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                      }}>
                        {log.error_type}
                      </span>
                      {log.user_email && (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {log.user_name || log.user_email}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    {!log.resolved && (
                      <button
                        onClick={() => handleResolveError(log.id)}
                        style={{
                          padding: '4px 10px', fontSize: '11px', borderRadius: '4px',
                          background: 'rgba(16,185,129,0.1)', color: '#10B981',
                          border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer',
                          fontWeight: 600, whiteSpace: 'nowrap',
                        }}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                    {log.error_message}
                  </div>
                  {log.error_context && (
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                      Context: {log.error_context}
                    </div>
                  )}
                  {log.stack_trace && (
                    <details style={{ marginTop: '6px' }}>
                      <summary style={{ fontSize: '11px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>Stack trace</summary>
                      <pre style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'pre-wrap', marginTop: '4px', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'auto', maxHeight: '150px' }}>
                        {log.stack_trace}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem', paddingBottom: '2rem' }}>
        Please report any bugs to Arun Potta
      </div>
    </div>
  );
}
