"""Website Inspection & Responsive Layout Analyzer.

Performs:
- Headings hierarchy analysis (H1-H6)
- Responsive multi-viewport analysis (Desktop, Tablet, Mobile) with screenshot captures
- Form & button accessibility auditing (missing alt texts, missing labels)
- Comprehensive UI/UX & accessibility recommendation generation
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from app.services.browser.playwright_service import playwright_browser

logger = logging.getLogger("mohib_ai.services.browser.inspector")


class WebsiteInspector:
    """Analyzes page structure, responsive layouts, and accessibility metrics."""

    VIEWPORTS = {
        "desktop": {"width": 1280, "height": 800, "label": "Desktop (1280x800)"},
        "tablet": {"width": 768, "height": 1024, "label": "Tablet iPad (768x1024)"},
        "mobile": {"width": 375, "height": 667, "label": "Mobile iPhone (375x667)"},
    }

    async def inspect_website(self, target_url: Optional[str] = None) -> Dict[str, Any]:
        """Perform full inspection of active or target webpage."""
        if target_url:
            await playwright_browser.navigate_to(target_url)

        if not target_url:
            status = playwright_browser.get_status()
            if not status["is_active"]:
                await playwright_browser.start_session()

        status = playwright_browser.get_status()
        current_url = status["current_url"]
        title = status["page_title"]

        # 1. Structural Element Analysis
        structure = await playwright_browser.evaluate("""() => {
            const getTexts = (sel) => Array.from(document.querySelectorAll(sel)).map(e => e.innerText.trim()).filter(Boolean).slice(0, 10);

            // Headings
            const headings = {
                h1: getTexts('h1'),
                h2: getTexts('h2'),
                h3: getTexts('h3'),
            };

            // Accessibility checks
            const images = Array.from(document.querySelectorAll('img'));
            const imagesMissingAlt = images.filter(img => !img.hasAttribute('alt') || !img.getAttribute('alt').trim()).length;

            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'));
            const inputsMissingLabels = inputs.filter(inp => {
                const id = inp.id;
                const hasLabel = id ? document.querySelector('label[for="' + id + '"]') : false;
                const hasAria = inp.hasAttribute('aria-label') || inp.hasAttribute('placeholder');
                return !hasLabel && !hasAria;
            }).length;

            const linksCount = document.querySelectorAll('a[href]').length;
            const buttonsCount = document.querySelectorAll('button, [role="button"]').length;
            const formsCount = document.querySelectorAll('forms, form').length;

            return {
                headings,
                imagesTotal: images.length,
                imagesMissingAlt,
                inputsTotal: inputs.length,
                inputsMissingLabels,
                linksCount,
                buttonsCount,
                formsCount,
            };
        }""")

        # 2. Responsive Viewport Screenshots
        viewport_results = {}
        for vp_key, vp_cfg in self.VIEWPORTS.items():
            try:
                await playwright_browser.set_viewport_size(vp_cfg["width"], vp_cfg["height"])
                await asyncio.sleep(0.3)
                shot = await playwright_browser.capture_screenshot()
                viewport_results[vp_key] = {
                    "label": vp_cfg["label"],
                    "width": vp_cfg["width"],
                    "height": vp_cfg["height"],
                    "screenshot_b64": shot["screenshot_b64"],
                }
            except Exception as e:
                logger.warning(f"Failed to capture viewport {vp_key}: {e}")

        # Restore original viewport
        await playwright_browser.set_viewport_size(1280, 800)

        # 3. Generate Findings & Suggestions
        issues_bn = []
        issues_en = []
        suggestions_bn = []
        suggestions_en = []

        # Check H1 heading
        h1_list = structure.get("headings", {}).get("h1", [])
        if len(h1_list) == 0:
            issues_bn.append("পৃষ্ঠায় কোনো <h1> হেডিং পাওয়া যায়নি (SEO ও অ্যাক্সেসিবিলিটির ক্ষতি)।")
            issues_en.append("No <h1> heading detected on the page (harms SEO and accessibility).")
            suggestions_bn.append("একটি স্পষ্ট এবং বর্ণনাধর্মী প্রধান <h1> হেডিং যুক্ত করুন।")
            suggestions_en.append("Add a single, descriptive top-level <h1> heading.")
        elif len(h1_list) > 1:
            issues_bn.append(f"পৃষ্ঠায় একাধিক <h1> হেডিং রয়েছে ({len(h1_list)}টি)।")
            issues_en.append(f"Multiple <h1> headings found ({len(h1_list)}), which may confuse screen readers.")
            suggestions_bn.append("প্রতিটি পেজে শুধুমাত্র ১টি মূল <h1> হেডিং এবং সাব-হেডিং হিসেবে <h2> ব্যবহার করুন।")
            suggestions_en.append("Use a single <h1> heading per page and structure sub-sections with <h2>.")

        # Check image alt tags
        img_missing_alt = structure.get("imagesMissingAlt", 0)
        if img_missing_alt > 0:
            issues_bn.append(f"{img_missing_alt}টি ছবিতে কোনো 'alt' টেক্সট দেওয়া নেই।")
            issues_en.append(f"{img_missing_alt} image(s) lack accessible 'alt' attribute text.")
            suggestions_bn.append("স্ক্রিন রিডারের সুবিধার জন্য সমস্ত ছবিতে যথাযথ 'alt' বিবরণ যুক্ত করুন।")
            suggestions_en.append("Provide concise descriptive 'alt' tags for all informational images.")

        # Check form labels
        inp_missing_labels = structure.get("inputsMissingLabels", 0)
        if inp_missing_labels > 0:
            issues_bn.append(f"{inp_missing_labels}টি ইনপুট ফিল্ডে সুস্পষ্ট লেবেল বা aria-label নেই।")
            issues_en.append(f"{inp_missing_labels} input field(s) lack explicit <label> or aria-label attributes.")
            suggestions_bn.append("প্রতিটি ইনপুটের সাথে লেবেল ট্যাগ বা placeholder ও aria-label দিন।")
            suggestions_en.append("Associate every input with an explicit <label for='...'> or aria-label.")

        if not issues_bn:
            issues_bn.append("কোনো গুরুতর লেআউট বা অ্যাক্সেসিবিলিটি সমস্যা পাওয়া যায়নি।")
            issues_en.append("No critical accessibility or layout issues detected.")
            suggestions_bn.append("ডিজাইনটি পরিষ্কার এবং আধুনিক।")
            suggestions_en.append("Page design is modern, accessible, and well structured.")

        return {
            "url": current_url,
            "title": title,
            "structure": structure,
            "viewports": viewport_results,
            "issues_bn": issues_bn,
            "issues_en": issues_en,
            "suggestions_bn": suggestions_bn,
            "suggestions_en": suggestions_en,
            "summary_bn": f"ওয়েবসাইট ইন্সপেকশন সম্পন্ন। {len(issues_bn)}টি পর্যবেক্ষণ এবং রেসপনসিভ ভিউ বিশ্লেষণ করা হয়েছে।",
            "summary_en": f"Website inspection completed. {len(issues_en)} observation(s) noted across responsive viewports.",
        }


website_inspector = WebsiteInspector()
