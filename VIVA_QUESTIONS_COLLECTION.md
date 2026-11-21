# 🎓 DTU HEALTH CENTER - VIVA QUESTIONS & ANSWERS LOG
**Repository of User Queries & Custom Viva Prep Answers**
*This file records every question asked during the preparation session. It will be compiled into a final PDF report upon user request.*

---


### Q1: Why were dropdown `<select>` options appearing blank/invisible in dark mode, and how was it solved?
* **Problem:** In Chromium-based browsers (Brave, Chrome, Edge) on Windows, when a parent `<select>` is given `color: #ffffff`, the nested `<option>` elements inherit that white font color. However, native browser popups default to a white background. As a result, white text rendered against a white background, making all dropdown items invisible except the blue-highlighted active item.
* **Technical Solution:** 
  1. Applied `color-scheme: dark;` to `.form-select`, which instructs the browser engine to render the native picker window in dark theme.
  2. Explicitly styled `select option` with `background-color: #161b26 !important;` and `color: #ffffff !important;` for Dark Mode.
  3. Added high-contrast overrides for Light Mode (`color-scheme: light;`, `background-color: #ffffff;`, `color: #0f172a;`).
