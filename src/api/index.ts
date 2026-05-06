import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data: { username: string; password: string; email?: string }) =>
    api.post('/users/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/users/login', data),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: { email?: string }) => api.put('/users/profile', data),
  checkIn: () => api.post('/users/check-in'),
  getStats: () => api.get('/users/stats'),
};

export const storyAPI = {
  create: (data: { title: string; summary: string; content: string; mode?: string; max_nodes?: number; team_id?: number; competition_id?: number }) =>
    api.post('/stories', data),
  getAll: (params: { status?: string; mode?: string; sort_by?: string; page?: number; limit?: number }) =>
    api.get('/stories', { params }),
  getById: (id: number) => api.get(`/stories/${id}`),
  update: (id: number, data: { title?: string; summary?: string; status?: string }) =>
    api.put(`/stories/${id}`, data),
  delete: (id: number) => api.delete(`/stories/${id}`),
  getMyStories: () => api.get('/stories/my'),
  search: (q: string) => api.get('/stories/search', { params: { q } }),
  getTimeline: (storyId: number) => api.get(`/stories/${storyId}/timeline`),
};

export const nodeAPI = {
  add: (data: { story_id: number; parent_id?: number; content: string }) =>
    api.post('/nodes', data),
  getByStory: (story_id: number) => api.get(`/nodes/${story_id}`),
  select: (node_id: number) => api.put(`/nodes/${node_id}/select`),
  unselect: (node_id: number) => api.put(`/nodes/${node_id}/unselect`),
  autoSelect: (story_id: number) => api.post(`/nodes/${story_id}/auto-select`),
};

export const interactionAPI = {
  like: (story_id: number) => api.post(`/stories/${story_id}/like`),
  favorite: (story_id: number) => api.post(`/stories/${story_id}/favorite`),
  coin: (node_id: number, amount: number) => api.post(`/nodes/${node_id}/coin`, { amount }),
  getFavorites: () => api.get('/favorites'),
};

export const inventoryAPI = {
  exchange: (data: { item_type: string; quantity?: number }) =>
    api.post('/inventory/exchange', data),
  get: () => api.get('/inventory'),
  use: (data: { item_type: string; story_id?: number }) => api.post('/inventory/use', data),
};

export const teamAPI = {
  create: (data: { name: string }) => api.post('/teams', data),
  join: (team_id: number) => api.post(`/teams/${team_id}/join`),
  leave: (team_id: number) => api.post(`/teams/${team_id}/leave`),
  getAll: () => api.get('/teams'),
  getUserTeams: () => api.get('/teams/user'),
  getMembers: (team_id: number) => api.get(`/teams/${team_id}/members`),
  createCompetition: (data: { title: string; description?: string; end_time?: string }) =>
    api.post('/competitions', data),
  joinCompetition: (data: { competition_id: number; team_id: number }) =>
    api.post('/competitions/join', data),
  getCompetitions: () => api.get('/competitions'),
  getLeaderboard: (competition_id: number) => api.get(`/competitions/${competition_id}/leaderboard`),
};
