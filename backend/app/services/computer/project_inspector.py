"""Developer Assistant Project Inspector.

Analyzes permitted source code projects, generates structure trees,
detects frameworks, and generates structured reviews with diffs.
"""

import os
from typing import Dict, Any, List, Optional
from app.services.computer.path_guard import PathGuard, SecurityViolationError


class ProjectInspector:
    """Provides project structure analysis, tech stack detection, and code reviews."""

    def __init__(self, path_guard: Optional[PathGuard] = None):
        self.path_guard = path_guard or PathGuard()

    def inspect_project(self, project_path: Optional[str] = None) -> Dict[str, Any]:
        """Inspect a permitted project directory and return structured analysis."""
        if not project_path or not project_path.strip():
            allowed = self.path_guard.allowed_directories
            project_path = allowed[0] if allowed else os.path.abspath(".")

        canonical = self.path_guard.validate_path(project_path)
        if not os.path.isdir(canonical):
            raise FileNotFoundError(f"Project directory not found: '{project_path}'")

        # Detect tech stack
        tech_stack = self._detect_tech_stack(canonical)

        # Build folder tree summary (max depth 3)
        tree = self._build_tree(canonical, max_depth=3)

        # Identify key project files
        key_files = self._find_key_files(canonical)

        return {
            "project_name": os.path.basename(canonical) or canonical,
            "project_path": canonical,
            "tech_stack": tech_stack,
            "key_files": key_files,
            "tree": tree,
            "summary_bn": (
                f"প্রজেক্টটি সফলভাবে স্ক্যান করা হয়েছে। সনাক্তকৃত প্রযুক্তি: {', '.join(tech_stack) if tech_stack else 'General Codebase'}। "
                f"প্রধান কনফিগারেশন ফাইল সংখ্যা: {len(key_files)}।"
            ),
            "summary_en": (
                f"Project scanned successfully. Detected stack: {', '.join(tech_stack) if tech_stack else 'General Codebase'}. "
                f"Identified {len(key_files)} key configuration files."
            ),
        }

    def _detect_tech_stack(self, root_dir: str) -> List[str]:
        """Identify frameworks and languages based on signature files."""
        stack = []
        entries = set(os.listdir(root_dir))

        if "package.json" in entries:
            stack.append("Node.js")
            # Check for next.js
            if "next.config.js" in entries or "next.config.ts" in entries or "next.config.mjs" in entries:
                stack.append("Next.js")
            if os.path.exists(os.path.join(root_dir, "frontend", "package.json")):
                stack.append("Next.js (Frontend)")

        if "requirements.txt" in entries or "pyproject.toml" in entries or "setup.py" in entries:
            stack.append("Python")
            if os.path.exists(os.path.join(root_dir, "backend")):
                stack.append("FastAPI (Backend)")

        if "tsconfig.json" in entries:
            stack.append("TypeScript")

        if "tailwind.config.js" in entries or "tailwind.config.ts" in entries:
            stack.append("Tailwind CSS")

        if "Dockerfile" in entries or "docker-compose.yml" in entries:
            stack.append("Docker")

        # Also inspect immediate subdirectories like backend/frontend
        if os.path.isdir(os.path.join(root_dir, "backend")):
            backend_entries = set(os.listdir(os.path.join(root_dir, "backend")))
            if "requirements.txt" in backend_entries:
                if "FastAPI (Backend)" not in stack:
                    stack.append("FastAPI (Backend)")

        if os.path.isdir(os.path.join(root_dir, "frontend")):
            frontend_entries = set(os.listdir(os.path.join(root_dir, "frontend")))
            if "package.json" in frontend_entries:
                if "Next.js (Frontend)" not in stack:
                    stack.append("Next.js (Frontend)")

        return stack or ["Python / JavaScript Web Application"]

    def _find_key_files(self, root_dir: str) -> List[Dict[str, Any]]:
        """Identify key configuration, entrypoint, and documentation files."""
        candidates = [
            "package.json", "requirements.txt", "README.md",
            "backend/app/main.py", "frontend/src/app/page.tsx",
            ".env.example", "next.config.ts", "tsconfig.json",
            "docs/ARCHITECTURE.md",
        ]
        found = []
        for rel in candidates:
            full = os.path.join(root_dir, rel)
            if os.path.isfile(full):
                stat = os.stat(full)
                found.append({
                    "relative_path": rel.replace("\\", "/"),
                    "full_path": full,
                    "size_bytes": stat.st_size,
                })
        return found

    def _build_tree(self, current_dir: str, depth: int = 0, max_depth: int = 2) -> Dict[str, Any]:
        """Construct directory tree up to max_depth."""
        name = os.path.basename(current_dir) or current_dir
        node: Dict[str, Any] = {
            "name": name,
            "path": current_dir,
            "is_dir": True,
            "children": [],
        }

        if depth >= max_depth:
            return node

        skip = {".git", ".next", "node_modules", "venv", "__pycache__", ".pytest_cache"}
        try:
            with os.scandir(current_dir) as it:
                entries = sorted(list(it), key=lambda e: (not e.is_dir(), e.name.lower()))
                for entry in entries:
                    if entry.name in skip or entry.name.startswith("."):
                        continue
                    if entry.is_dir():
                        node["children"].append(
                            self._build_tree(entry.path, depth + 1, max_depth)
                        )
                    else:
                        node["children"].append({
                            "name": entry.name,
                            "path": entry.path,
                            "is_dir": False,
                            "size_bytes": entry.stat().st_size,
                        })
        except Exception:
            pass

        return node


project_inspector = ProjectInspector()

