/**
 * Browser fetch face for the host git-sidebar routes.
 */

import type { GitStatusEntry, GitTabInjected } from './types.ts'

/** Route prefix the host plugin registers. */
export const GIT_PREFIX = '/_git'

/**
 * One request against the git-sidebar host routes.
 * @param url - absolute path on the same origin.
 * @param init - optional fetch init.
 * @returns the parsed JSON body.
 */
export async function callGit<T>(url: string, init?: RequestInit): Promise<T> {
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
 * Bind the host routes into the inject face the Git tab receives.
 * @param prefix - route prefix; omitted uses `/_git`.
 * @param request - fetch helper; omitted uses {@link callGit}.
 * @returns the inject face.
 */
export function createGitApi(
  prefix = GIT_PREFIX,
  request: typeof callGit = callGit,
): GitTabInjected {
  return {
    status: async (cwd) => {
      const body = await request<{ entries: GitStatusEntry[] }>(
        `${prefix}/status?cwd=${encodeURIComponent(cwd)}`,
      )
      return body.entries
    },
    diff: async (cwd, path) => {
      const body = await request<{ diff: string }>(
        `${prefix}/diff?cwd=${encodeURIComponent(cwd)}&path=${encodeURIComponent(path)}`,
      )
      return body.diff
    },
    commit: async (cwd, message, paths) => {
      await request(`${prefix}/commit`, {
        method: 'POST',
        body: JSON.stringify({ cwd, message, paths }),
      })
    },
  }
}
