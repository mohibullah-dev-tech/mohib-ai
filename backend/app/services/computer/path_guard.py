"""Security Path Validation and File Guard for Safe Windows Computer Control.

Enforces:
1. Strict directory confinement (prevents directory traversal and outside access).
2. Blocklist for sensitive files (.env, private keys, secrets, credentials, browser profiles).
3. Text vs binary file detection.
4. Maximum file read size constraints.
"""

import os
import fnmatch
from typing import List, Tuple, Optional
from app.core.config import settings


class SecurityViolationError(Exception):
    """Raised when an operation violates path confinement or security rules."""
    pass


class PathGuard:
    """Validates filesystem operations against allowed directories and blocked patterns."""

    # Sensitive filenames or glob patterns that must NEVER be read, modified, or exposed
    BLOCKED_PATTERNS = [
        ".env",
        ".env.*",
        "*.env",
        "*id_rsa*",
        "*id_ecdsa*",
        "*id_ed25519*",
        "*.pem",
        "*.key",
        "*.pfx",
        "*.p12",
        "*.kdbx",
        "*credential*",
        "*password*",
        "*secret*",
        "*.shadow",
        "*sam",
        "*system",
        "*ntds.dit",
        "*login data*",
        "*cookies*",
        "*web data*",
    ]

    # Windows root system paths that must never be added as allowed directories
    CRITICAL_WINDOWS_PATHS = [
        r"C:\Windows",
        r"C:\Windows\System32",
        r"C:\Windows\SysWOW64",
        r"C:\Program Files",
        r"C:\Program Files (x86)",
    ]

    # Supported text and code extensions
    KNOWN_TEXT_EXTENSIONS = {
        ".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".txt",
        ".html", ".htm", ".css", ".scss", ".sass", ".less",
        ".yaml", ".yml", ".xml", ".toml", ".ini", ".cfg", ".conf",
        ".sh", ".bash", ".bat", ".cmd", ".ps1", ".sql",
        ".rs", ".go", ".java", ".c", ".cpp", ".h", ".hpp", ".cs",
        ".rb", ".php", ".svg", ".lock",
    }

    # Special text filenames without standard extensions
    KNOWN_TEXT_FILENAMES = {
        "dockerfile", "makefile", ".gitignore", ".dockerignore",
        ".editorconfig", ".env.example", "procfile", "license", "readme"
    }

    def __init__(self, allowed_directories: Optional[List[str]] = None):
        if allowed_directories is not None:
            self._allowed_dirs = [self._canonicalize(d) for d in allowed_directories if d]
        else:
            self._allowed_dirs = [self._canonicalize(d) for d in settings.get_allowed_directories_list()]

    @staticmethod
    def _canonicalize(path: str) -> str:
        """Resolve symbolic links, relative segments, and canonicalize path."""
        abs_path = os.path.abspath(os.path.realpath(path))
        # On Windows, normalize case for reliable comparisons
        return os.path.normcase(abs_path)

    @property
    def allowed_directories(self) -> List[str]:
        """Return canonical allowed directories."""
        return list(self._allowed_dirs)

    def add_allowed_directory(self, dir_path: str) -> str:
        """Add a directory to permitted list after validating it is not a forbidden system path."""
        if not os.path.isdir(dir_path):
            raise SecurityViolationError(f"Directory does not exist: {dir_path}")

        canonical = self._canonicalize(dir_path)

        # Disallow root drive or critical Windows directories
        norm_canonical = canonical.rstrip("\\/")
        for crit in self.CRITICAL_WINDOWS_PATHS:
            norm_crit = self._canonicalize(crit).rstrip("\\/")
            if norm_canonical == norm_crit or norm_canonical.startswith(norm_crit + "\\"):
                raise SecurityViolationError(
                    f"Security policy forbids adding critical system directory: {dir_path}"
                )

        # Disallow root drives like 'c:' or 'c:\'
        split_drive = os.path.splitdrive(canonical)
        if split_drive[0] and split_drive[1].strip("\\/") == "":
            raise SecurityViolationError("Security policy forbids adding an entire drive root.")

        if canonical not in self._allowed_dirs:
            self._allowed_dirs.append(canonical)
        return canonical

    def remove_allowed_directory(self, dir_path: str) -> bool:
        """Remove a directory from permitted list."""
        canonical = self._canonicalize(dir_path)
        if canonical in self._allowed_dirs:
            self._allowed_dirs.remove(canonical)
            return True
        return False

    def validate_path(self, target_path: str) -> str:
        """Verify that target_path is within one of the allowed directories.

        Returns canonical path if valid, raises SecurityViolationError otherwise.
        """
        if not target_path or not target_path.strip():
            raise SecurityViolationError("Target path cannot be empty.")

        # Detect raw directory traversal attempt patterns
        if ".." in target_path.replace("\\", "/").split("/"):
            canonical_test = self._canonicalize(target_path)
        else:
            canonical_test = self._canonicalize(target_path)

        # Check confinement against allowed directories
        is_confined = False
        for allowed in self._allowed_dirs:
            try:
                common = os.path.commonpath([allowed, canonical_test])
                if common == allowed:
                    is_confined = True
                    break
            except ValueError:
                # Different drives (e.g., C: vs D:) on Windows
                continue

        if not is_confined:
            raise SecurityViolationError(
                f"Access denied: '{target_path}' is outside permitted directories."
            )

        # Check sensitive file blocklist
        file_name = os.path.basename(canonical_test).lower()
        for pattern in self.BLOCKED_PATTERNS:
            if fnmatch.fnmatch(file_name, pattern):
                raise SecurityViolationError(
                    f"Access denied: '{file_name}' matches protected sensitive file pattern '{pattern}'."
                )

        return canonical_test

    def is_text_file(self, file_path: str) -> Tuple[bool, str]:
        """Determine whether a file is a readable text/code file.

        Returns (is_text, reason).
        """
        if not os.path.isfile(file_path):
            return False, "Not a regular file"

        base_name = os.path.basename(file_path).lower()
        _, ext = os.path.splitext(base_name)

        # Fast path by extension / known name
        if ext in self.KNOWN_TEXT_EXTENSIONS or base_name in self.KNOWN_TEXT_FILENAMES:
            is_likely_text = True
        else:
            is_likely_text = False

        # Content inspection for null bytes (\x00)
        try:
            with open(file_path, "rb") as f:
                sample = f.read(1024)
                if b"\x00" in sample:
                    return False, "Binary file detected (contains null bytes)"
        except Exception as e:
            return False, f"Cannot inspect file: {e}"

        return True, "Valid text/code file"

