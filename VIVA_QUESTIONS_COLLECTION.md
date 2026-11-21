# 🎓 DTU HEALTH CENTER - VIVA QUESTIONS & ANSWERS LOG
**Repository of User Queries & Custom Viva Prep Answers**
*This file records every question asked during the preparation session. It will be compiled into a final PDF report upon user request.*

---


### Q1: Why were dropdown `<select>` options appearing blank/invisible in dark mode, and how was it solved?
* **Problem:** In Chromium-based browsers (Brave, Chrome, Edge) running on Windows, the `<select>` popup menu is rendered as an OS-level native window overlay with a default white background (`#ffffff`). Because the dark UI's `.form-select` set font `color: #ffffff;`, the `<option>` tags inherited pure white text inside the OS-rendered white popup box. Chromium on Windows disregards CSS `background-color` inside native option popups, causing white text to render on a white background—making every option invisible except when highlighted by mouse-over/keyboard focus (which applies the OS blue highlight bar).
* **Technical Solution & Viva Explanation:** 
  1. **Option Contrast Inversion:** Styled `.form-select option, select option` with `background-color: #ffffff !important;` and high-contrast deep charcoal text `color: #0f172a !important;` alongside `color-scheme: light;`.
  2. **Dual State Appearance:** When the `<select>` input is closed on the page, `.form-select` displays crisp white text against the dark glassmorphism background. When the user clicks to open the dropdown, the opened popup menu cleanly displays dark, highly legible `#0f172a` text against the white popup background.
  3. **Placeholder Styling:** Disabled placeholder options (e.g. `<option value="" disabled selected>`) were styled with `color: #94a3b8 !important;` for proper visual hierarchy.
  4. **Cache Invalidation:** Appended version query parameters `css/style.css?v=2.2` across all project HTML files to instantly invalidate stale browser cache.
