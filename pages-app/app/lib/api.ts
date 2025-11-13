const API_BASE_URL = 'https://seportal-api.arunpotta1024.workers.dev';

export const api = {
  // URL Assets
  urlAssets: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    like: async (id: string, userEmail: string) => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    getUserLikes: async (userEmail: string) => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/user-likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    incrementUses: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/${id}/use`, {
        method: 'POST',
      });
      return res.json();
    },
  },

  // File Assets
  fileAssets: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    upload: async (file: File, metadata: any) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(metadata));

      const res = await fetch(`${API_BASE_URL}/api/file-assets/upload`, {
        method: 'POST',
        body: formData,
      });
      return res.json();
    },
    download: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets/${id}/download`);
      return res;
    },
    update: async (id: string, data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Scripts
  scripts: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/api/scripts`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/scripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    like: async (id: string, userEmail: string) => {
      const res = await fetch(`${API_BASE_URL}/api/scripts/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    getUserLikes: async (userEmail: string) => {
      const res = await fetch(`${API_BASE_URL}/api/scripts/user-likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    incrementUses: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/scripts/${id}/use`, {
        method: 'POST',
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/scripts/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Events
  events: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/api/events`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Shoutouts
  shoutouts: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    like: async (id: string, userEmail: string) => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    getUserLikes: async (userEmail: string) => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts/user-likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Users
  users: {
    getByEmail: async (email: string) => {
      const res = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(email)}`);
      if (res.status === 404) {
        return null;
      }
      return res.json();
    },
    createOrUpdate: async (email: string, name: string) => {
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
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/api/polls`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    vote: async (id: string, optionIndex: number, userEmail: string) => {
      const res = await fetch(`${API_BASE_URL}/api/polls/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex, userEmail }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to vote');
      }
      return res.json();
    },
    getUserVotes: async (userEmail: string) => {
      const res = await fetch(`${API_BASE_URL}/api/polls/user-votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/polls/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Groups
  groups: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/api/groups`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    addMember: async (groupId: string, userEmail: string) => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    removeMember: async (groupId: string, userEmail: string) => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/members/${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Announcements
  announcements: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/api/announcements`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/announcements/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Competitions
  competitions: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/api/competitions`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/competitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/competitions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/competitions/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    join: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/competitions/${id}/join`, {
        method: 'POST',
      });
      return res.json();
    },
  },

  // Products
  products: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Employees
  employees: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/api/employees`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    uploadPhoto: async (id: string, photo: File) => {
      const formData = new FormData();
      formData.append('photo', photo);
      const res = await fetch(`${API_BASE_URL}/api/employees/${id}/photo`, {
        method: 'POST',
        body: formData,
      });
      return res.json();
    },
    getPhoto: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/employees/${id}/photo`);
      return res;
    },
  },
};
