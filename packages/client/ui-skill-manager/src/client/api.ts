/**
 * Browser fetch face for the host skill-manager routes.
 *
 * Same-origin `fetch` carries the login cookie; the host still rejects the
 * call when `connection.requestRejection` says so.
 */

import type {
  BrowseResult, CreateDraft, ScanResult, SkillFile, SkillsSectionInjected, TrashEntry,
} from './types.ts'

/** Route prefix the host plugin registers. */
export const SKILL_MANAGER_PREFIX = '/_skill-manager'

/**
 * One request against the skill-manager host routes.
 * @param url - absolute path on the same origin.
 * @param init - optional fetch init; JSON content-type is always set.
 * @returns the parsed JSON body.
 */
export async function callSkillManager<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`)
  return body
}

/**
 * Encode raw zip bytes as base64 without spreading a huge argument list.
 * @param bytes - raw archive bytes.
 * @returns the base64 payload the import route accepts.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * Bind the host routes into the inject face the Settings section receives.
 * @param prefix - route prefix; omitted uses the shipped `/_skill-manager`.
 * @param request - fetch helper; omitted uses {@link callSkillManager}.
 * @returns the inject face.
 */
export function createSkillsApi(
  prefix = SKILL_MANAGER_PREFIX,
  request: typeof callSkillManager = callSkillManager,
): SkillsSectionInjected {
  return {
    scan: () => request<ScanResult>(`${prefix}/scan`),
    readFile: path => request<SkillFile>(`${prefix}/file?path=${encodeURIComponent(path)}`),
    browse: path => request<BrowseResult>(
      path === undefined ? `${prefix}/browse` : `${prefix}/browse?path=${encodeURIComponent(path)}`,
    ),
    toggle: async (source, name, enabled) => {
      await request(`${prefix}/toggle`, { method: 'POST', body: JSON.stringify({ source, name, enabled }) })
    },
    create: async (draft: CreateDraft) => {
      await request(`${prefix}/create`, { method: 'POST', body: JSON.stringify(draft) })
    },
    remove: async (source, name) => {
      await request(`${prefix}/delete`, { method: 'POST', body: JSON.stringify({ source, name }) })
    },
    importZip: async (source, name, bytes) => {
      await request(`${prefix}/import`, {
        method: 'POST',
        body: JSON.stringify({ source, name, base64: bytesToBase64(bytes) }),
      })
    },
    listTrash: async () => {
      const body = await request<{ entries: TrashEntry[] }>(`${prefix}/trash`)
      return body.entries
    },
    restoreTrash: async (id) => {
      await request(`${prefix}/trash-restore`, { method: 'POST', body: JSON.stringify({ id }) })
    },
    purgeTrash: async (id) => {
      await request(`${prefix}/trash-delete`, { method: 'POST', body: JSON.stringify({ id }) })
    },
  }
}
