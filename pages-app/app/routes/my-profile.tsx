import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function meta() {
  return [
    { title: "My Profile - SolutionHub" },
    { name: "description", content: "Edit your profile and photo" },
  ];
}

export default function MyProfile() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    title: "",
    department: "",
    bio: "",
    location: "",
    region: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const userEmail = localStorage.getItem('seportal_user');
    setCurrentUserEmail(userEmail);
    if (userEmail) {
      loadMyProfile(userEmail);
    } else {
      setLoading(false);
    }
  }, []);

  const loadMyProfile = async (email: string) => {
    try {
      const employees = await api.employees.getAll();
      const myProfile = employees.find((emp: any) => emp.email === email);

      if (myProfile) {
        setEmployee(myProfile);
        setFormData({
          name: myProfile.name || "",
          email: myProfile.email || "",
          title: myProfile.title || "",
          department: myProfile.department || "",
          bio: myProfile.bio || "",
          location: myProfile.location || "",
          region: myProfile.region || "",
        });

        // Load photo preview if exists
        if (myProfile.photo_url) {
          const photoUrl = `${import.meta.env?.VITE_API_URL || 'https://seportal-api.arunpotta1024.workers.dev'}/api/employees/${myProfile.id}/photo`;
          setPhotoPreview(photoUrl);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!employee) return;

    setSaving(true);
    try {
      // Update profile info
      await api.employees.update(employee.id, {
        ...formData,
        managerId: employee.manager_id || null,
        photoUrl: employee.photo_url || "",
        startDate: employee.start_date || "",
      });

      // Upload photo if provided
      if (photoFile) {
        await api.employees.uploadPhoto(employee.id, photoFile);
      }

      alert('Profile updated successfully!');
      setEditing(false);
      if (currentUserEmail) {
        loadMyProfile(currentUserEmail);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!currentUserEmail) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
        <h3>Please Log In</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          You need to be logged in to view your profile.
        </p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
        <h3>Profile Not Found</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Your profile hasn't been created yet. Please contact an administrator.
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '1rem' }}>
          Logged in as: {currentUserEmail}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>My Profile</h2>
          <p>Manage your personal information and photo</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)}>
            ✏️ Edit Profile
          </button>
        )}
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Photo Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: photoPreview ? 'transparent' : 'linear-gradient(135deg, var(--cf-orange), var(--cf-blue))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              fontWeight: '600',
              color: 'white',
              marginBottom: '1rem',
              overflow: 'hidden',
              border: '4px solid var(--border-color)'
            }}
          >
            {photoPreview ? (
              <img
                src={photoPreview}
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

          {editing && (
            <div>
              <label
                htmlFor="photo-upload"
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--cf-orange)',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'inline-block'
                }}
              >
                📷 Change Photo
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
              {photoFile && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center' }}>
                  Selected: {photoFile.name}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Information */}
        {editing ? (
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled
                style={{ background: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Email cannot be changed
              </div>
            </div>

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Senior Sales Engineer"
              />
            </div>

            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Sales Engineering"
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., San Francisco, CA"
              />
            </div>

            <div className="form-group">
              <label>Region</label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              >
                <option value="">-- Select Region --</option>
                <option value="AMER">AMER (Americas)</option>
                <option value="EMEA">EMEA (Europe, Middle East, Africa)</option>
                <option value="APAC">APAC (Asia Pacific)</option>
                <option value="LATAM">LATAM (Latin America)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditing(false);
                  setFormData({
                    name: employee.name || "",
                    email: employee.email || "",
                    title: employee.title || "",
                    department: employee.department || "",
                    bio: employee.bio || "",
                    location: employee.location || "",
                    region: employee.region || "",
                  });
                  setPhotoFile(null);
                  if (employee.photo_url) {
                    const photoUrl = `${import.meta.env?.VITE_API_URL || 'https://seportal-api.arunpotta1024.workers.dev'}/api/employees/${employee.id}/photo`;
                    setPhotoPreview(photoUrl);
                  } else {
                    setPhotoPreview(null);
                  }
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Name</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{employee.name}</div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Email</div>
              <div>{employee.email}</div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Title</div>
              <div>{employee.title}</div>
            </div>

            {employee.department && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Department</div>
                <div>{employee.department}</div>
              </div>
            )}

            {employee.location && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Location</div>
                <div>📍 {employee.location}</div>
              </div>
            )}

            {employee.region && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Region</div>
                <div>🌍 {employee.region}</div>
              </div>
            )}

            {employee.bio && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Bio</div>
                <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{employee.bio}</div>
              </div>
            )}

            {employee.start_date && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Start Date</div>
                <div>{new Date(employee.start_date).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem', paddingBottom: '2rem' }}>
        Please report any bugs to Arun Potta
      </div>
    </div>
  );
}
