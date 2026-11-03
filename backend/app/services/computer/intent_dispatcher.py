"""Voice & Chat Computer Intent Dispatcher.

Detects natural language and voice commands (in Bangla and English) for:
- System overview & hardware specs
- Project structure & codebase architecture inspection
- Listing files in permitted folders
- Searching files by name
- Reading text and source files
- Requesting file creation, modification, deletion, or command execution (with single-use approval)
"""

import os
import re
import logging
from typing import Optional, Tuple, Dict, Any

from app.services.computer.windows_agent import windows_agent
from app.services.computer.project_inspector import project_inspector
from app.services.computer.path_guard import SecurityViolationError

logger = logging.getLogger("mohib_ai.services.computer.intent_dispatcher")


class ComputerIntentDispatcher:
    """Dispatches voice/chat intents to local computer agent actions safely."""

    def is_bangla(self, text: str) -> bool:
        """Detect whether text contains Bengali characters or Banglish keywords."""
        bangla_chars = any("\u0980" <= ch <= "\u09FF" for ch in text)
        if bangla_chars:
            return True
        banglish_tokens = {
            "dekhao", "koro", "bolo", "pora", "poro", "amar", "laptop", "khuje",
            "koto", "fole", "ki", "ase", "korte", "parba", "parbe", "bano", "banaw",
            "khulo", "dekhaw"
        }
        words = set(re.findall(r"\w+", text.lower()))
        return len(words.intersection(banglish_tokens)) >= 1

    def handle(self, message: str) -> Optional[Tuple[str, str, str]]:
        """Analyze message for computer control intents.

        Returns (reply_text, provider_name, model_name) or None if not an intent.
        """
        msg = message.strip()
        msg_lower = msg.lower()
        bangla_lang = self.is_bangla(msg)

        # 0. Power Controls Intent (Shutdown / Restart / Lock / Cancel)
        shutdown_patterns = [
            "shut down laptop", "shutdown laptop", "shut down computer", "shutdown computer",
            "shut down pc", "shutdown pc", "turn off laptop", "turn off computer", "power off laptop",
            "ল্যাপটপ বন্ধ করো", "ল্যাপটপ শাটডাউন করো", "শাট ডাউন করো", "ল্যাপটপ বন্ধ",
            "laptop bondho koro", "laptop shutdown koro", "shutdown koro", "shut down", "shutdown"
        ]
        if any(p in msg_lower for p in shutdown_patterns) or (
            ("shut" in msg_lower and "down" in msg_lower and ("laptop" in msg_lower or "pc" in msg_lower or "computer" in msg_lower or len(msg.split()) <= 3))
            or ("bondho" in msg_lower and ("laptop" in msg_lower or "pc" in msg_lower or "computer" in msg_lower))
        ):
            return self._handle_power_request("shutdown", bangla_lang)

        restart_patterns = [
            "restart laptop", "reboot laptop", "restart computer", "reboot computer",
            "restart pc", "reboot pc", "ল্যাপটপ রিস্টার্ট করো", "ল্যাপটপ রিবুট করো",
            "রিস্টার্ট করো", "laptop restart koro"
        ]
        if any(p in msg_lower for p in restart_patterns) or ("restart" in msg_lower and ("laptop" in msg_lower or "pc" in msg_lower or "computer" in msg_lower or len(msg.split()) <= 2)):
            return self._handle_power_request("restart", bangla_lang)

        lock_patterns = [
            "lock laptop", "lock screen", "lock computer", "lock pc",
            "ল্যাপটপ লক করো", "স্ক্রিন লক করো", "laptop lock koro"
        ]
        if any(p in msg_lower for p in lock_patterns) or ("lock" in msg_lower and ("laptop" in msg_lower or "screen" in msg_lower or "pc" in msg_lower or len(msg.split()) <= 2)):
            return self._handle_power_request("lock", bangla_lang)

        cancel_patterns = [
            "cancel shutdown", "abort shutdown", "শাটডাউন বাতিল করো", "shutdown cancel koro"
        ]
        if any(p in msg_lower for p in cancel_patterns):
            return self._handle_power_request("cancel", bangla_lang)

        # 1. System Info / Hardware Specs Intent
        sys_keywords = [
            "system info", "laptop info", "pc specs", "hardware info", "computer info",
            "system status", "laptop status", "specs", "সিস্টেম ইনফো", "ল্যাপটপ ইনফো",
            "ল্যাপটপের তথ্য", "কম্পিউটার ইনফো", "ল্যাপটপ স্ট্যাটাস", "সিপিইউ কত", "র‍্যাম কত",
            "laptop specs", "laptop specs dekhao", "system info dekhao"
        ]
        if any(k in msg_lower for k in sys_keywords) or (
            ("laptop" in msg_lower or "system" in msg_lower or "কম্পিউটার" in msg or "ল্যাপটপ" in msg)
            and ("info" in msg_lower or "specs" in msg_lower or "তথ্য" in msg or "অবস্থা" in msg or "স্ট্যাটাস" in msg or "dekhao" in msg_lower)
        ):
            return self._handle_system_info(bangla_lang)

        # 2. Inspect Project / Codebase Architecture Intent
        inspect_keywords = [
            "inspect project", "analyze codebase", "project structure", "architecture",
            "code review", "review project", "প্রজেক্ট ইন্সপেক্ট", "প্রজেক্টের স্ট্রাকচার",
            "কোডবেস রিভিউ", "প্রজেক্ট অ্যানালাইজ", "আর্কিটেকচার দেখাও", "inspect codebase",
            "project dekhao", "structure dekhao"
        ]
        if any(k in msg_lower for k in inspect_keywords) or (
            ("project" in msg_lower or "প্রজেক্ট" in msg or "codebase" in msg_lower)
            and ("inspect" in msg_lower or "structure" in msg_lower or "ইন্সপেক্ট" in msg or "স্ট্রাকচার" in msg or "রিভিউ" in msg)
        ):
            return self._handle_inspect_project(bangla_lang)

        # 3. List Files Intent
        list_keywords = [
            "list files", "show files", "list directory", "what files", "files in folder",
            "ফাইল দেখাও", "ফাইল লিস্ট", "ডিরেক্টরি দেখাও", "কি কি ফাইল আছে", "files dekhao", "file dekhao"
        ]
        if any(k in msg_lower for k in list_keywords) or (
            ("file" in msg_lower or "files" in msg_lower or "ফাইল" in msg)
            and ("list" in msg_lower or "show" in msg_lower or "dekhao" in msg_lower or "দেখাও" in msg)
            and "search" not in msg_lower and "read" not in msg_lower and "search" not in msg_lower
        ):
            return self._handle_list_files(bangla_lang)

        # 4. Search File Intent
        search_match = re.search(
            r"(?:search|find|খুঁজে বের করো|সার্চ করো|search for)\s+(?:file\s+)?([a-zA-Z0-9_\-\.]+)",
            msg,
            re.IGNORECASE,
        ) or re.search(
            r"([a-zA-Z0-9_\-\.]+)\s+(?:search|find|খুঁজুন|খোঁজ|search koro)",
            msg,
            re.IGNORECASE,
        )
        if search_match:
            filename = search_match.group(1).strip()
            # Avoid matching common words
            if filename.lower() not in {"files", "project", "system", "info", "me", "the", "a", "koro", "dekhao"}:
                return self._handle_search_file(filename, bangla_lang)

        # 5. Read File Intent
        read_match = re.search(
            r"(?:read|open|view|show content of|পড়ো|পড়ুন|ওপেন করো|দেখাও)\s+(?:file\s+)?([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9]+)",
            msg,
            re.IGNORECASE,
        ) or re.search(
            r"([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9]+)\s+(?:file\s+)?(?:read|open|পড়ো|পড়ুন|dekhaw|dekhao)",
            msg,
            re.IGNORECASE,
        )
        if read_match:
            filename = read_match.group(1).strip()
            return self._handle_read_file(filename, bangla_lang)

        # 6. Create File Request Intent (Requires explicit approval)
        create_match = re.search(
            r"(?:create|make|write|নতুন ফাইল তৈরি করো|ফাইল বানাও|create file)\s+([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)",
            msg,
            re.IGNORECASE,
        )
        if create_match:
            filename = create_match.group(1).strip()
            return self._handle_create_file_request(filename, bangla_lang)

        return None

    def _handle_system_info(self, bangla: bool) -> Tuple[str, str, str]:
        """Format live system info for voice & chat response."""
        data = windows_agent.get_system_info()
        disk = data.get("disk") or {}

        if bangla:
            reply = (
                "💻 **ফ্রাইডে ল্যাপটপ সিস্টেম ওভারভিউ:**\n\n"
                f"- **অপারেটিং সিস্টেম:** {data.get('os')} {data.get('os_release')} ({data.get('machine')})\n"
                f"- **সিপিইউ প্রসেসর:** {data.get('processor') or 'Intel/AMD Processor'} ({data.get('cpu_cores')} Logical Cores)\n"
                f"- **ডিস্ক স্টোরেজ:** {disk.get('free_gb', 'N/A')} GB খালি / {disk.get('total_gb', 'N/A')} GB মোট ({disk.get('percent_used', 'N/A')}% ব্যবহূত)\n"
                f"- **লোকাল এজেন্ট স্ট্যাটাস:** 🟢 অনলাইন (`{data.get('binding')}`)\n"
                f"- **অনুমোদিত ফোল্ডার:** {data.get('allowed_directories_count')}টি ডিরেক্টরি সুরক্ষিত\n\n"
                "সবকিছু সম্পূর্ণ স্বাভাবিক এবং নিরাপদে চলছে, বস!"
            )
        else:
            reply = (
                "💻 **Friday Laptop System Overview:**\n\n"
                f"- **Operating System:** {data.get('os')} {data.get('os_release')} ({data.get('machine')})\n"
                f"- **Processor:** {data.get('processor') or 'Intel/AMD Processor'} ({data.get('cpu_cores')} Logical Cores)\n"
                f"- **Disk Storage:** {disk.get('free_gb', 'N/A')} GB free of {disk.get('total_gb', 'N/A')} GB total\n"
                f"- **Local Agent Status:** 🟢 Online (`{data.get('binding')}`)\n"
                f"- **Permitted Directories:** {data.get('allowed_directories_count')} active folders\n\n"
                "All systems are running safely and smoothly, Boss!"
            )
        return reply, "local-windows-agent", "system-v1"

    def _handle_inspect_project(self, bangla: bool) -> Tuple[str, str, str]:
        """Analyze project structure and return architecture breakdown."""
        try:
            data = project_inspector.inspect_project()
            stack_str = ", ".join(data.get("tech_stack", []))
            key_files = data.get("key_files", [])

            if bangla:
                reply = (
                    f"🔍 **প্রজেক্ট আর্কিটেকচার অ্যানালাইসিস ({data.get('project_name')}):**\n\n"
                    f"• **সনাক্তকৃত টেক স্ট্যাক:** `{stack_str}`\n"
                    f"• **প্রজেক্ট পাথ:** `{data.get('project_path')}`\n"
                    f"• **প্রধান কনফিগারেশন ফাইলসমূহ ({len(key_files)}টি):**\n"
                )
                for kf in key_files[:6]:
                    reply += f"  - `{kf.get('relative_path')}` ({round(kf.get('size_bytes', 0)/1024, 1)} KB)\n"
                reply += (
                    f"\n📋 **সারসংক্ষেপ:**\n{data.get('summary_bn')}\n\n"
                    "আপনি চাইলে নির্দিষ্ট কোনো ফাইলের বিস্তারিত কোড দেখতে পারেন।"
                )
            else:
                reply = (
                    f"🔍 **Project Architecture Analysis ({data.get('project_name')}):**\n\n"
                    f"• **Detected Stack:** `{stack_str}`\n"
                    f"• **Root Path:** `{data.get('project_path')}`\n"
                    f"• **Key Configuration Files ({len(key_files)}):**\n"
                )
                for kf in key_files[:6]:
                    reply += f"  - `{kf.get('relative_path')}` ({round(kf.get('size_bytes', 0)/1024, 1)} KB)\n"
                reply += (
                    f"\n📋 **Summary:**\n{data.get('summary_en')}\n\n"
                    "Let me know if you would like me to inspect or explain any specific source file!"
                )
            return reply, "local-windows-agent", "inspector-v1"
        except Exception as e:
            err_msg = f"Project inspection failed: {e}"
            return err_msg, "local-windows-agent", "error"

    def _handle_list_files(self, bangla: bool) -> Tuple[str, str, str]:
        """List files in current permitted folder."""
        try:
            files = windows_agent.list_directory()
            top_files = files[:15]

            if bangla:
                reply = f"📁 **অনুমোদিত প্রজেক্ট ডিরেক্টরির ফাইলসমূহ ({len(files)}টি এন্ট্রি):**\n\n"
                for f in top_files:
                    icon = "📁" if f["is_dir"] else "📄"
                    size_str = f"({round(f['size_bytes']/1024, 1)} KB)" if not f["is_dir"] else ""
                    reply += f"- {icon} `{f['name']}` {size_str}\n"
                if len(files) > 15:
                    reply += f"\n*...এবং আরও {len(files) - 15}টি ফাইল রয়েছে।*"
            else:
                reply = f"📁 **Permitted Directory Files ({len(files)} entries):**\n\n"
                for f in top_files:
                    icon = "📁" if f["is_dir"] else "📄"
                    size_str = f"({round(f['size_bytes']/1024, 1)} KB)" if not f["is_dir"] else ""
                    reply += f"- {icon} `{f['name']}` {size_str}\n"
                if len(files) > 15:
                    reply += f"\n*...and {len(files) - 15} more files.*"

            return reply, "local-windows-agent", "fs-v1"
        except Exception as e:
            return f"Error listing files: {e}", "local-windows-agent", "error"

    def _handle_search_file(self, query: str, bangla: bool) -> Tuple[str, str, str]:
        """Search files by name within allowed directories."""
        try:
            results = windows_agent.search_files(query)
            if not results:
                if bangla:
                    return f"🔍 `{query}` নামে অনুমোদিত ফোল্ডারের ভেতর কোনো ফাইল খুঁজে পাওয়া যায়নি।", "local-windows-agent", "fs-v1"
                return f"🔍 No files matching `{query}` were found in permitted folders.", "local-windows-agent", "fs-v1"

            if bangla:
                reply = f"🔍 **`{query}` এর জন্য {len(results)}টি ফাইল পাওয়া গেছে:**\n\n"
                for r in results[:8]:
                    reply += f"- 📄 `{r['name']}` ({round(r['size_bytes']/1024, 1)} KB) — `{r['path']}`\n"
            else:
                reply = f"🔍 **Found {len(results)} matches for `{query}`:**\n\n"
                for r in results[:8]:
                    reply += f"- 📄 `{r['name']}` ({round(r['size_bytes']/1024, 1)} KB) — `{r['path']}`\n"

            return reply, "local-windows-agent", "fs-v1"
        except Exception as e:
            return f"Error searching files: {e}", "local-windows-agent", "error"

    def _handle_read_file(self, filename: str, bangla: bool) -> Tuple[str, str, str]:
        """Read text or code file safely."""
        try:
            # First search to resolve full path if only relative name given
            if not os.path.isabs(filename):
                matches = windows_agent.search_files(filename)
                if not matches:
                    return (
                        f"⚠️ `{filename}` ফাইলটি খুঁজে পাওয়া যায়নি।" if bangla else f"⚠️ Could not find file `{filename}`.",
                        "local-windows-agent",
                        "fs-v1"
                    )
                target_path = matches[0]["path"]
            else:
                target_path = filename

            data = windows_agent.read_text_file(target_path)
            content = data["content"]
            lines = data["lines"]
            preview = "\n".join(content.splitlines()[:50])

            _, ext = os.path.splitext(target_path)
            lang = ext.lstrip(".") or "text"

            if bangla:
                reply = (
                    f"📖 **ফাইল রিড সম্পন্ন (`{data['filename']}`):**\n"
                    f"- মোট লাইন: {lines} টি | সাইজ: {round(data['size_bytes']/1024, 1)} KB\n\n"
                    f"```{lang}\n{preview}\n```"
                )
                if lines > 50:
                    reply += f"\n*(প্রথম ৫০ লাইন প্রদর্শিত হয়েছে, মোট লাইন {lines})*"
            else:
                reply = (
                    f"📖 **File Content for `{data['filename']}`:**\n"
                    f"- Total Lines: {lines} | Size: {round(data['size_bytes']/1024, 1)} KB\n\n"
                    f"```{lang}\n{preview}\n```"
                )
                if lines > 50:
                    reply += f"\n*(Displaying first 50 lines of {lines})*"

            return reply, "local-windows-agent", "fs-v1"
        except SecurityViolationError as e:
            return f"🛡️ **নিরাপত্তা নীতি লঙ্ঘন:** {e}" if bangla else f"🛡️ **Security Policy Violation:** {e}", "local-windows-agent", "security"
        except Exception as e:
            return f"Error reading file: {e}", "local-windows-agent", "error"

    def _handle_create_file_request(self, filename: str, bangla: bool) -> Tuple[str, str, str]:
        """Create pending approval for file creation."""
        allowed = windows_agent.path_guard.allowed_directories
        target_dir = allowed[0] if allowed else os.path.abspath(".")
        target_path = os.path.join(target_dir, filename)

        req = windows_agent.request_create_file(
            target_path=target_path,
            content="# Created by Friday Local Computer Agent\n",
            explanation=f"Voice request to create new file '{filename}'",
        )

        if bangla:
            reply = (
                f"🛡️ **ফাইল তৈরির অনুমোদন রিকোয়েস্ট তৈরি হয়েছে!**\n\n"
                f"- **টার্গেট পাথ:** `{target_path}`\n"
                f"- **রিস্ক লেভেল:** `{req.risk_level.upper()}`\n"
                f"- **অ্যাপ্রুভাল আইডি:** `{req.id[:8]}...`\n\n"
                "নিরাপত্তা বিধির কারণে আপনার অনুমোদন আবশ্যক। "
                "দয়া করে আপনার স্ক্রিনে আসা **Approval Dialog** অথবা **Laptop Control** প্যানেল থেকে **'Approve'** বাটনে ক্লিক করুন।"
            )
        else:
            reply = (
                f"🛡️ **File Creation Approval Request Generated!**\n\n"
                f"- **Target Path:** `{target_path}`\n"
                f"- **Risk Level:** `{req.risk_level.upper()}`\n"
                f"- **Approval ID:** `{req.id[:8]}...`\n\n"
                "Per safety policy, your explicit consent is required. "
                "Please click **'Approve'** in the confirmation dialog on your screen to proceed."
            )

        return reply, "local-windows-agent", "approval-v1"

    def _handle_power_request(self, action: str, bangla: bool) -> Tuple[str, str, str]:
        """Generate a secure approval request for Windows power operations."""
        req = windows_agent.request_power_action(
            action=action,
            explanation=f"Voice/chat requested Windows {action}",
        )

        if action == "shutdown":
            if bangla:
                reply = (
                    "⚠️ **[ল্যাপটপ শাটডাউন অনুমোদন আবশ্যক]**\n\n"
                    "বস, আপনি ল্যাপটপ শাটডাউন করার নির্দেশ দিয়েছেন। কোনো অসমাপ্ত কাজের ডাটা যাতে না হারায়, সেজন্য নিরাপত্তা নীতি অনুযায়ী আপনার সুনির্দিষ্ট অনুমোদন প্রয়োজন।\n\n"
                    f"- **টার্গেট কমান্ড:** `shutdown /s /t 30`\n"
                    f"- **ঝুঁকির মাত্রা:** `CRITICAL (উচ্চ ঝুঁকি)`\n"
                    f"- **রিকোয়েস্ট আইডি:** `{req.id[:8]}...`\n\n"
                    "👉 অনুগ্রহ করে আপনার স্ক্রিনের **Approval Dialog** অথবা **Laptop Control** প্যানেলে গিয়ে **'Approve'** বাটনে ক্লিক করুন। "
                    "(অনুমোদন দিলে ৩০ সেকেন্ডের মধ্যে কম্পিউটার নিরাপদে শাটডাউন হবে)।"
                )
            else:
                reply = (
                    "⚠️ **[Windows Laptop Shutdown Confirmation Required]**\n\n"
                    "Boss, you requested a system shutdown. Per safety policy, destructive system actions require explicit user confirmation to prevent accidental data loss.\n\n"
                    f"- **Action:** System Shutdown (`shutdown /s /t 30`)\n"
                    f"- **Risk Level:** `CRITICAL`\n"
                    f"- **Approval ID:** `{req.id[:8]}...`\n\n"
                    "👉 Please click **'Approve'** in the confirmation dialog on your screen to proceed. "
                    "Once approved, your laptop will safely shut down in 30 seconds."
                )
        elif action == "restart":
            if bangla:
                reply = (
                    "⚠️ **[ল্যাপটপ রিস্টার্ট অনুমোদন আবশ্যক]**\n\n"
                    "উইন্ডোজ রিস্টার্ট করার জন্য আপনার অনুমোদন প্রয়োজন।\n\n"
                    f"- **টার্গেট কমান্ড:** `shutdown /r /t 30`\n"
                    f"- **ঝুঁকির মাত্রা:** `CRITICAL`\n\n"
                    "👉 স্ক্রিনে আসা ডায়ালগে **'Approve'** বাটনে ক্লিক করুন।"
                )
            else:
                reply = (
                    "⚠️ **[System Restart Confirmation Required]**\n\n"
                    f"- **Target Command:** `shutdown /r /t 30`\n"
                    f"- **Risk Level:** `CRITICAL`\n\n"
                    "👉 Please click **'Approve'** in the confirmation dialog on your screen."
                )
        elif action == "lock":
            if bangla:
                reply = (
                    "🔒 **[স্ক্রিন লক রিকোয়েস্ট তৈরি হয়েছে]**\n\n"
                    f"- **টার্গেট কমান্ড:** `LockWorkStation`\n\n"
                    "👉 স্ক্রিনে **'Approve'** ক্লিক করলেই সাথে সাথে উইন্ডোজ স্ক্রিন লক হয়ে যাবে।"
                )
            else:
                reply = (
                    "🔒 **[Lock Workstation Request Created]**\n\n"
                    f"- **Target Command:** `LockWorkStation`\n\n"
                    "👉 Click **'Approve'** in the confirmation dialog to lock your screen immediately."
                )
        else:
            reply = "Shutdown cancel command requested." if not bangla else "শাটডাউন বাতিল কমান্ড পাঠানো হয়েছে।"

        return reply, "local-windows-agent", "power-v1"


computer_intent_dispatcher = ComputerIntentDispatcher()

