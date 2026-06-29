import type { Group, DaySchedule, Proposal } from './types';

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

// ── 邀约 API ──

export function getProposals(groupId: string): Promise<Proposal[]> {
  return request(`/groups/${groupId}/proposals`);
}

export function createProposal(
  groupId: string,
  data: {
    from: string;
    to: string[];
    dateKey: string;
    dateLabel: string;
    startSlot: string;
    endSlot: string;
    activity: string;
    note?: string;
  }
): Promise<{ id: string; responses: Record<string, string> }> {
  return request(`/groups/${groupId}/proposals`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── AI 助手 ──

export async function askAssistant(
  groupId: string,
  message: string,
): Promise<{
  reply: string;
  plans: { dateKey: string; dateLabel: string; slots: Record<string, string> }[];
  suggestions: { text: string; action: string; dateKey?: string; slot?: string; peer?: string }[];
  callouts: string[];
}> {
  const res = await fetch(`${BASE}/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, message }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || 'AI 调用失败');
  }
  return res.json();
}

export function respondProposal(
  groupId: string,
  proposalId: string,
  member: string,
  response: 'yes' | 'no'
): Promise<{ responses: Record<string, string> }> {
  return request(`/groups/${groupId}/proposals/${proposalId}`, {
    method: 'PUT',
    body: JSON.stringify({ member, response }),
  });
}
