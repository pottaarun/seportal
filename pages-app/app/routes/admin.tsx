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

  useEffect(() => {
    if (activeTab === "groups") {
      loadGroups();
    } else if (activeTab === "products") {
      loadProducts();
    } else if (activeTab === "employees") {
      loadEmployees();
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

      <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem', paddingBottom: '2rem' }}>
        Please report any bugs to Arun Potta
      </div>
    </div>
  );
}
