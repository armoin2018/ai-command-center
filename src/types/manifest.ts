/**
 * Manifest Types for AI Kit File Tracking
 * 
 * Provides interfaces for manifest-based file tracking, enabling surgical
 * install/uninstall of AI Kit files with hash-based integrity verification.
 * 
 * Part of AICC-0097: Manifest-Based File Tracking
 */

/**
 * Root manifest structure for a deployed AI Kit.
 * Stored at `.project/manifests/{kitName}.manifest.json`.
 */
export interface KitManifest {
    /** Schema version for forward compatibility */
    version: '1.0.0';
    /** Unique kit identifier */
    kitName: string;
    /** Kit version string (semver) */
    kitVersion: string;
    /** Source repository URL */
    sourceRepo: string;
    /** Source branch name */
    sourceBranch: string;
    /** ISO 8601 timestamp of initial installation */
    installedAt: string;
    /** ISO 8601 timestamp of last update */
    updatedAt: string;
    /** Tracked files deployed by this kit */
    files: ManifestFileEntry[];
}

/**
 * Individual file entry within a manifest.
 * Tracks source path, deployment target, and integrity hash.
 */
export interface ManifestFileEntry {
    /** Path relative to the source repository root */
    sourcePath: string;
    /** Path relative to workspace root where the file was deployed */
    targetPath: string;
    /** SHA-256 hash of the file content at installation time */
    hash: string;
    /** File size in bytes */
    size: number;
    /** ISO 8601 timestamp of when this file was installed */
    installedAt: string;
    /** True if the user has modified the file after installation */
    modified: boolean;
}

/**
 * Result of manifest validation.
 */
export interface ManifestValidationResult {
    /** Whether the manifest passes all schema checks */
    valid: boolean;
    /** List of validation error messages */
    errors: string[];
}

/**
 * Result of corruption detection scan.
 */
export interface CorruptionReport {
    /** Files listed in manifest but not found on disk */
    missing: string[];
    /** Files on disk whose hash differs from the manifest */
    corrupted: string[];
    /** Files on disk not tracked by any manifest */
    extra: string[];
}

/**
 * Result of an uninstall operation.
 */
export interface UninstallResult {
    /** Files that were successfully removed */
    removed: string[];
    /** Files skipped because the user modified them */
    skipped: string[];
}
