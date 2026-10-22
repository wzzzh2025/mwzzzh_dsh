/** Wire types mirrored from `@deepseek-ai/dsh-git-sidebar` for the Git tab. */

/** One porcelain status row. */
export interface GitStatusEntry {
  path: string
  index: string
  worktree: string
  untracked: boolean
}

/** Injected host operations the tab body calls. */
export interface GitTabInjected {
  status: (cwd: string) => Promise<GitStatusEntry[]>
  diff: (cwd: string, path: string) => Promise<string>
  commit: (cwd: string, message: string, paths: readonly string[]) => Promise<void>
}
