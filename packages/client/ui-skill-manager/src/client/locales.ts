/** Locale bundles for the skills settings surface. */

/** Locale keys the surface renders. */
export type SkillsLocaleKey =
  | 'nav'
  | 'title'
  | 'intro'
  | 'refresh'
  | 'loading'
  | 'empty'
  | 'roots'
  | 'rootMissing'
  | 'rootPresent'
  | 'loadable'
  | 'disabled'
  | 'problems'
  | 'problemFix'
  | 'enable'
  | 'disable'
  | 'remove'
  | 'create'
  | 'createName'
  | 'createDescription'
  | 'createBody'
  | 'createSubmit'
  | 'createCancel'
  | 'import'
  | 'importHint'
  | 'browse'
  | 'browseTitle'
  | 'browseEmpty'
  | 'detail'
  | 'detailClose'
  | 'confirmRemove'
  | 'trash'
  | 'trashEmpty'
  | 'restore'
  | 'purge'
  | 'confirmPurge'
  | 'failed'
  | 'retry'

/** English copy. */
export const en: Record<SkillsLocaleKey, string> = {
  nav: 'Skills',
  title: 'Skills',
  intro: 'Every skill this session can load, plus the ones that were skipped and why.',
  refresh: 'Rescan',
  loading: 'Scanning…',
  empty: 'No skills found in any root.',
  roots: 'Roots',
  rootMissing: 'missing',
  rootPresent: 'entries',
  loadable: 'Loadable',
  disabled: 'Disabled',
  problems: 'Skipped',
  problemFix: 'Fix',
  enable: 'Enable',
  disable: 'Disable',
  remove: 'Delete',
  create: 'New skill',
  createName: 'Name (kebab-case)',
  createDescription: 'Description',
  createBody: 'Instructions (markdown)',
  createSubmit: 'Create',
  createCancel: 'Cancel',
  import: 'Import .zip',
  importHint: 'The archive must contain a SKILL.md. Paths outside the skill root are dropped.',
  browse: 'Browse',
  browseTitle: 'Skill directories',
  browseEmpty: 'This directory is empty.',
  detail: 'View SKILL.md',
  detailClose: 'Close',
  confirmRemove: 'Move this skill to trash? You can restore it later.',
  trash: 'Trash',
  trashEmpty: 'Trash is empty.',
  restore: 'Restore',
  purge: 'Delete forever',
  confirmPurge: 'Permanently delete this skill from trash?',
  failed: 'Request failed',
  retry: 'Retry',
}

/** Simplified Chinese copy. */
export const zh: Record<SkillsLocaleKey, string> = {
  nav: '技能',
  title: '技能',
  intro: '本会话可加载的全部技能，以及被跳过的那几个和原因。',
  refresh: '重新扫描',
  loading: '扫描中…',
  empty: '所有根目录里都没有技能。',
  roots: '根目录',
  rootMissing: '不存在',
  rootPresent: '项',
  loadable: '可加载',
  disabled: '已停用',
  problems: '被跳过',
  problemFix: '修法',
  enable: '启用',
  disable: '停用',
  remove: '删除',
  create: '新建技能',
  createName: '名称（kebab-case）',
  createDescription: '描述',
  createBody: '正文（markdown）',
  createSubmit: '创建',
  createCancel: '取消',
  import: '导入 .zip',
  importHint: '压缩包内必须有 SKILL.md。指向技能根目录之外的路径会被丢弃。',
  browse: '浏览目录',
  browseTitle: '技能目录',
  browseEmpty: '这个目录是空的。',
  detail: '查看 SKILL.md',
  detailClose: '关闭',
  confirmRemove: '把这个技能放进回收站？之后还可以恢复',
  trash: '回收站',
  trashEmpty: '回收站是空的。',
  restore: '恢复',
  purge: '永久删除',
  confirmPurge: '从回收站永久删除这个技能？',
  failed: '请求失败',
  retry: '重试',
}
