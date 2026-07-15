import { localAuth } from './localAuth';

const BASE = import.meta.env.VITE_BASE44_APP_BASE_URL || '';

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localAuth.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export const localApi = {
  lessons: (language) => request('GET', `/api/lessons${language ? `?language=${encodeURIComponent(language)}` : ''}`),
  courses: () => request('GET', '/api/courses'),
  lesson: (id) => request('GET', `/api/lessons/${encodeURIComponent(id)}`),
  achievements: () => request('GET', '/api/achievements'),
  progress: () => request('GET', '/api/progress'),
  completeLesson: (id, score) => request('PUT', `/api/progress/${encodeURIComponent(id)}`, { score }),
  profile: () => request('GET', '/api/profile'),
  updateProfile: (data) => request('PATCH', '/api/profile', data),
  translate: (text, from, to) => request('POST', '/api/translate', { text, from, to }),
};
