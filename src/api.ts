import type { Group, DaySchedule } from './types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `请求失败: ${res.status}`);
  }
  return res.json();
}

export function createGroup(name: string, members: string[]): Promise<Group & { id: string }> {
  return request('/groups', {
    method: 'POST',
    body: JSON.stringify({ name, members }),
  });
}

export function getGroup(id: string): Promise<Group> {
  return request(`/groups/${id}`);
}

export function updateMood(
  id: string,
  member: string,
  dateKey: string,
  mood: string
): Promise<Group> {
  return request(`/groups/${id}/mood`, {
    method: 'PUT',
    body: JSON.stringify({ member, dateKey, mood }),
  });
}

export function updateSchedule(
  id: string,
  member: string,
  dateKey: string,
  busySlots: DaySchedule
): Promise<Group> {
  return request(`/groups/${id}/schedule`, {
    method: 'PUT',
    body: JSON.stringify({ member, dateKey, busySlots }),
  });
}
