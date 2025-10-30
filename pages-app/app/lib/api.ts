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
};
