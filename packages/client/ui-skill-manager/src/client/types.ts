/** Wire types mirrored from `@deepseek-ai/dsh-skill-manager` for the Settings page. */

/** One root row, mirroring the host's `RootReport`. */
export interface RootReport {
  source: string
  path: string
  rank: number
  present: boolean
  entries: number
}

/** One loadable or parked skill. */
export interface SkillEntry {
  name: string
  description: string
  path: string
  root: string
  shape: 'directory' | 'file'
  bundle: string
  rootPath: string
  bodyChars: number
  whenToUse?: string
}

/** One rejected candidate. */
export interface SkillProblem {
  name: string
  path: string
  root: string
  reason: string
  detail: string
  fix?: string
}

/** Full scan result the page renders. */
export interface ScanResult {
  roots: RootReport[]
  skills: SkillEntry[]
  disabled: SkillEntry[]
  problems: SkillProblem[]
  missingRoots: string[]
}

/** One entry visible in the directory browser. */
export interface BrowseEntry {
  name: string
  path: string
  kind: 'directory' | 'file'
  isSkill?: boolean
}

/** One directory listing. */
export interface BrowseResult {
  path: string
  parent?: string
  entries: BrowseEntry[]
}

/** One skill file opened in the detail panel. */
export interface SkillFile {
  path: string
  text: string
}

/** Draft used by the create form. */
export interface CreateDraft {
  source: string
  name: string
  description: string
  body: string
}

/** One recoverable trash row. */
export interface TrashEntry {
  id: string
  name: string
  bundle: string
  source: string
  rootPath: string
  deletedAt: number
}

/** Injected host operations the Settings section calls. */
export interface SkillsSectionInjected {
  /** Full inventory plus diagnostics. */
  scan: () => Promise<ScanResult>
  /** One SKILL.md (or flat `.md`) for the detail panel. */
  readFile: (path: string) => Promise<SkillFile>
  /** Directory listing restricted to the skill roots. */
  browse: (path?: string) => Promise<BrowseResult>
  /** Park or restore one bundle. */
  toggle: (source: string, name: string, enabled: boolean) => Promise<void>
  /** Create a new bundle under the chosen root. */
  create: (draft: CreateDraft) => Promise<void>
  /** Move one bundle into the recoverable trash. */
  remove: (source: string, name: string) => Promise<void>
  /** Import a zip as a new bundle. */
  importZip: (source: string, name: string, bytes: Uint8Array) => Promise<void>
  /** Recoverable deletions, newest first. */
  listTrash: () => Promise<TrashEntry[]>
  /** Put one trash entry back on its original root. */
  restoreTrash: (id: string) => Promise<void>
  /** Permanently delete one trash entry. */
  purgeTrash: (id: string) => Promise<void>
}
