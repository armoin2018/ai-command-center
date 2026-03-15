/**
 * Centralized platform detection and OS-specific helpers.
 *
 * Provides a single source of truth for the current operating system,
 * shell environment, path conventions, and platform-specific directory
 * locations used across the AI Command Center extension.
 */

import * as os from 'os';
import * as path from 'path';

/** Supported platform identifiers */
export type PlatformId = 'macos' | 'windows' | 'linux';

/** Shell types available per platform */
export type ShellType = 'zsh' | 'bash' | 'powershell' | 'cmd' | 'sh';

/**
 * Immutable snapshot of the current platform's characteristics.
 * Serialisable to JSON for passing to webview panels.
 */
export interface PlatformInfo {
  /** Friendly platform id */
  readonly id: PlatformId;
  /** Node.js process.platform value (darwin | win32 | linux) */
  readonly raw: NodeJS.Platform;
  /** Human-readable label */
  readonly label: string;
  /** OS architecture (x64, arm64, etc.) */
  readonly arch: string;
  /** OS release string */
  readonly release: string;
  /** Home directory */
  readonly homeDir: string;
  /** Preferred path separator (/ or \\) */
  readonly sep: string;
  /** Default shell */
  readonly shell: ShellType;
  /** Whether the platform is Windows */
  readonly isWindows: boolean;
  /** Whether the platform is macOS */
  readonly isMacOS: boolean;
  /** Whether the platform is Linux */
  readonly isLinux: boolean;
}

/**
 * Well-known directory locations that differ per OS.
 */
export interface PlatformPaths {
  /** VS Code global cache for AI-ley kits */
  readonly globalCacheDir: string;
  /** Application data directory */
  readonly appDataDir: string;
  /** VS Code user config directory */
  readonly vscodeConfigDir: string;
  /** Temporary directory */
  readonly tempDir: string;
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

function resolvePlatformId(p: NodeJS.Platform): PlatformId {
  switch (p) {
    case 'darwin': return 'macos';
    case 'win32':  return 'windows';
    default:       return 'linux';   // linux, freebsd, etc.
  }
}

function resolveLabel(id: PlatformId): string {
  switch (id) {
    case 'macos':   return 'macOS';
    case 'windows': return 'Windows';
    case 'linux':   return 'Linux';
  }
}

function resolveShell(p: NodeJS.Platform): ShellType {
  switch (p) {
    case 'darwin': return 'zsh';
    case 'win32':  return 'powershell';
    default:       return 'bash';
  }
}

/* ------------------------------------------------------------------ */
/*  Public API – cached singleton                                      */
/* ------------------------------------------------------------------ */

let _info: PlatformInfo | undefined;

/**
 * Return an immutable PlatformInfo for the current OS.
 * Result is cached after the first call.
 */
export function getPlatformInfo(): PlatformInfo {
  if (_info) {
    return _info;
  }

  const raw = process.platform;
  const id  = resolvePlatformId(raw);

  _info = Object.freeze({
    id,
    raw,
    label:     resolveLabel(id),
    arch:      os.arch(),
    release:   os.release(),
    homeDir:   os.homedir(),
    sep:       path.sep,
    shell:     resolveShell(raw),
    isWindows: raw === 'win32',
    isMacOS:   raw === 'darwin',
    isLinux:   raw === 'linux',
  });

  return _info;
}

/**
 * Return well-known directory paths for the current platform.
 */
export function getPlatformPaths(): PlatformPaths {
  const home = os.homedir();
  const raw  = process.platform;

  let appDataDir: string;
  let vscodeConfigDir: string;
  let globalCacheDir: string;

  switch (raw) {
    case 'darwin':
      appDataDir      = path.join(home, 'Library', 'Application Support');
      vscodeConfigDir = path.join(appDataDir, 'Code', 'User');
      globalCacheDir  = path.join(home, '.vscode', 'ai-ley-cache');
      break;

    case 'win32':
      appDataDir      = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
      vscodeConfigDir = path.join(appDataDir, 'Code', 'User');
      globalCacheDir  = path.join(appDataDir, 'ai-ley-cache');
      break;

    default: // linux / freebsd
      appDataDir      = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
      vscodeConfigDir = path.join(appDataDir, 'Code', 'User');
      globalCacheDir  = path.join(home, '.vscode', 'ai-ley-cache');
      break;
  }

  return Object.freeze({
    globalCacheDir,
    appDataDir,
    vscodeConfigDir,
    tempDir: os.tmpdir(),
  });
}

/**
 * Return the platform-appropriate "open in file manager" command.
 */
export function getFileManagerCommand(): string {
  switch (process.platform) {
    case 'darwin': return 'open';
    case 'win32':  return 'explorer';
    default:       return 'xdg-open';
  }
}

/**
 * Return the platform-appropriate "open URL in browser" command.
 */
export function getBrowserCommand(): string {
  switch (process.platform) {
    case 'darwin': return 'open';
    case 'win32':  return 'start';
    default:       return 'xdg-open';
  }
}

/**
 * Return a serialisable subset of PlatformInfo safe for webview transport.
 * Omits file-system paths that should stay server-side.
 */
export function getPlatformInfoForWebview(): Pick<PlatformInfo, 'id' | 'label' | 'arch' | 'shell' | 'isWindows' | 'isMacOS' | 'isLinux' | 'sep'> {
  const info = getPlatformInfo();
  return {
    id:        info.id,
    label:     info.label,
    arch:      info.arch,
    shell:     info.shell,
    isWindows: info.isWindows,
    isMacOS:   info.isMacOS,
    isLinux:   info.isLinux,
    sep:       info.sep,
  };
}
