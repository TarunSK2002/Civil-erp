import api from './axios';

export const syncApi = {
  getStatus: async () => {
    const res = await api.get('/sync-status');
    return res.data;
  },
  triggerSync: async () => {
    const res = await api.post('/sync-trigger');
    return res.data;
  }
};
