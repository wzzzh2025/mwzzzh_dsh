/** Locale bundles for the right-sidebar Git tab. */

import type {} from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Git tab type name, guide entry, and body copy. */
    sidebarGit: SidebarGitKey
  }
}

/** Simplified Chinese dictionary and key-set source of truth. */
export const zh = {
  'type.label': 'Git',
  'guide.title': 'Git',
  'guide.description': '查看工作区 status、diff，并提交勾选的文件',
  noWorkspace: '这个会话没有工作区目录。',
  empty: '工作区是干净的。',
  refresh: '刷新',
  commit: '提交',
  message: '提交说明',
  diffEmpty: '没有 diff。',
  failed: '请求失败',
  retry: '重试',
} satisfies Record<string, string>

/** Locale keys the surface renders. */
export type SidebarGitKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en: Record<SidebarGitKey, string> = {
  'type.label': 'Git',
  'guide.title': 'Git',
  'guide.description': 'View workspace status and diff, and commit selected files',
  noWorkspace: 'This session has no workspace directory.',
  empty: 'The working tree is clean.',
  refresh: 'Refresh',
  commit: 'Commit',
  message: 'Commit message',
  diffEmpty: 'No diff.',
  failed: 'Request failed',
  retry: 'Retry',
}
