const API_BASE_URL = 'https://seportal-api.arunpotta1024.workers.dev';

export const api = {
  // URL Assets
  urlAssets: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    bulkDelete: async (ids: string[]): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      return res.json();
    },
    like: async (id: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    getUserLikes: async (userEmail: string): Promise<string[]> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/user-likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    incrementUses: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/${id}/use`, {
        method: 'POST',
      });
      return res.json();
    },
  },

  // File Assets
  fileAssets: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    upload: async (file: File, metadata: any): Promise<any> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(metadata));

      const res = await fetch(`${API_BASE_URL}/api/file-assets/upload`, {
        method: 'POST',
        body: formData,
      });
      return res.json();
    },
    download: async (id: string): Promise<Response> => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets/${id}/download`);
      return res;
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    bulkDelete: async (ids: string[]): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      return res.json();
    },
  },

  // Scripts
  scripts: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/scripts`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/scripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    like: async (id: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/scripts/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    getUserLikes: async (userEmail: string): Promise<string[]> => {
      const res = await fetch(`${API_BASE_URL}/api/scripts/user-likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    incrementUses: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/scripts/${id}/use`, {
        method: 'POST',
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/scripts/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Events
  events: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/events`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Shoutouts
  shoutouts: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    like: async (id: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    getUserLikes: async (userEmail: string): Promise<string[]> => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts/user-likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Users
  users: {
    getByEmail: async (email: string): Promise<any | null> => {
      const res = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(email)}`);
      if (res.status === 404) {
        return null;
      }
      return res.json();
    },
    createOrUpdate: async (email: string, name: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      return res.json();
    },
  },

  // Polls
  polls: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/polls`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    vote: async (id: string, optionIndex: number, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/polls/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex, userEmail }),
      });
      if (!res.ok) {
        const error = await res.json() as { error?: string };
        throw new Error(error.error || 'Failed to vote');
      }
      return res.json();
    },
    getUserVotes: async (userEmail: string): Promise<Record<string, number>> => {
      const res = await fetch(`${API_BASE_URL}/api/polls/user-votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/polls/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Groups
  groups: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/groups`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    addMember: async (groupId: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    removeMember: async (groupId: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/members/${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Announcements
  announcements: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/announcements`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/announcements/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Competitions
  competitions: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/competitions`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/competitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/competitions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/competitions/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    join: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/competitions/${id}/join`, {
        method: 'POST',
      });
      return res.json();
    },
  },

  // Products
  products: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Employees
  employees: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/employees`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    uploadPhoto: async (id: string, photo: File): Promise<any> => {
      const formData = new FormData();
      formData.append('photo', photo);
      const res = await fetch(`${API_BASE_URL}/api/employees/${id}/photo`, {
        method: 'POST',
        body: formData,
      });
      return res.json();
    },
    getPhoto: async (id: string): Promise<Response> => {
      const res = await fetch(`${API_BASE_URL}/api/employees/${id}/photo`);
      return res;
    },
  },

  // Skills Matrix
  skillCategories: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-categories`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-categories/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  skills: {
    getAll: async (categoryId?: string): Promise<any[]> => {
      const url = categoryId
        ? `${API_BASE_URL}/api/skills?category_id=${encodeURIComponent(categoryId)}`
        : `${API_BASE_URL}/api/skills`;
      const res = await fetch(url);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skills/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  skillAssessments: {
    getForUser: async (userEmail: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-assessments?user_email=${encodeURIComponent(userEmail)}`);
      return res.json();
    },
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-assessments/all`);
      return res.json();
    },
    save: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    saveBulk: async (userEmail: string, userName: string, assessments: { skill_id: string; level: number }[]): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-assessments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, user_name: userName, assessments }),
      });
      return res.json();
    },
  },

  universityCourses: {
    getAll: async (skillId?: string): Promise<any[]> => {
      const url = skillId
        ? `${API_BASE_URL}/api/university-courses?skill_id=${encodeURIComponent(skillId)}`
        : `${API_BASE_URL}/api/university-courses`;
      const res = await fetch(url);
      return res.json();
    },
    getRecommended: async (userEmail: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/university-courses/recommended?user_email=${encodeURIComponent(userEmail)}`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/university-courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/university-courses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/university-courses/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Course Completions (tracking status for library courses)
  courseCompletions: {
    getByUser: async (userEmail: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/course-completions?user_email=${encodeURIComponent(userEmail)}`);
      return res.json();
    },
    updateStatus: async (userEmail: string, courseId: string, status: 'not_started' | 'in_progress' | 'completed'): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/course-completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, course_id: courseId, status }),
      });
      return res.json();
    },
    remove: async (userEmail: string, courseId: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/course-completions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, course_id: courseId }),
      });
      return res.json();
    },
  },

  // Personal Courses (user-added custom courses)
  personalCourses: {
    getByUser: async (userEmail: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/personal-courses?user_email=${encodeURIComponent(userEmail)}`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/personal-courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/personal-courses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/personal-courses/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Feature Requests
  featureRequests: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    upvote: async (id: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests/${id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    getUserUpvotes: async (userEmail: string): Promise<string[]> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests/user-upvotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    addOpportunity: async (id: string, userEmail: string, userName: string, opportunityValue: number, customerName?: string, sfdcLink?: string, description?: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests/${id}/add-opportunity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, userName, opportunityValue, customerName, sfdcLink, description }),
      });
      return res.json();
    },
    deleteOpportunity: async (featureRequestId: string, opportunityId: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests/${featureRequestId}/opportunities/${opportunityId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Workday Integration
  workday: {
    getConfig: async (): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/workday-config`);
      return res.json();
    },
    saveConfig: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/workday-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    triggerSync: async (): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/workday-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_by: 'manual' }),
      });
      return res.json();
    },
    getSyncStatus: async (): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/workday-sync-status`);
      return res.json();
    },
    getSyncLogs: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/sync-logs`);
      return res.json();
    },
  },

  // Reports
  reports: {
    skillsByTeam: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/reports/skills-by-team`);
      return res.json();
    },
    courseCompletionByManager: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/reports/course-completion-by-manager`);
      return res.json();
    },
    onboardingProgress: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/reports/onboarding-progress`);
      return res.json();
    },
    headcount: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/reports/headcount`);
      return res.json();
    },
    skillsGapSummary: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/reports/skills-gap-summary`);
      return res.json();
    },
  },

  // AI Curriculum Analyzer
  ai: {
    analyzeCurriculum: async (): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/ai/analyze-curriculum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.json();
    },
  },

  // Course Assignments
  courseAssignments: {
    getForUser: async (userEmail: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/course-assignments?user_email=${encodeURIComponent(userEmail)}`);
      return res.json();
    },
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/course-assignments/all`);
      return res.json();
    },
    assign: async (data: { user_emails: string | string[]; course_ids: string | string[]; assigned_by: string; assigned_by_name?: string; due_date?: string; notes?: string; source?: string }): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/course-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/course-assignments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/course-assignments/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    autoAssign: async (userEmail: string, assignedBy?: string, assignedByName?: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/course-assignments/auto-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, assigned_by: assignedBy || 'system', assigned_by_name: assignedByName || 'System' }),
      });
      return res.json();
    },
  },

  // Workday Learning
  workdayLearning: {
    syncCourses: async (): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/workday-sync-courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.json();
    },
    pushEnrollment: async (userEmail: string, courseTitle: string, workdayCourseId?: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/workday-push-enrollment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, course_title: courseTitle, workday_course_id: workdayCourseId }),
      });
      return res.json();
    },
  },
};
