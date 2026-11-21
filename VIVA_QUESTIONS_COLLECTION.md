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

---

### Q2: How does direct deployment work without a GitHub repository? What is the difference between Git, GitHub, and Firebase Hosting?
* **Core Distinction (Git vs GitHub):**
  - **Git** is a local, distributed version control tool running directly on your operating system. Your local repository (`dtu-health-center/.git`) is already active and tracks every code commit, branch, and change history completely offline on your disk.
  - **GitHub** is simply a third-party cloud hosting platform (a remote backup and collaboration portal). Git does not depend on GitHub; Git functions 100% autonomously without any GitHub account.
* **How Firebase Deploys Without GitHub:**
  - Traditional CI/CD platforms (like Vercel, Netlify, or Render) often listen to GitHub webhooks.
  - In contrast, **Firebase Hosting (Google Cloud Platform)** operates via a **Direct CLI Pipeline**:
    1. When `firebase deploy` is executed, the `firebase-tools` CLI reads your local `firebase.json` configuration file (`"public": "."`).
    2. It creates an archive hash of your local static files (HTML, CSS, JS, assets) on your local hard disk.
    3. The CLI uses your authenticated Google OAuth credentials to stream those files directly to **Google's Global CDN (Content Delivery Network)** via HTTPS REST APIs (`firebasehosting.googleapis.com`).
    4. Google automatically provisions a globally distributed SSL certificate and serves the site live at `https://dtu-health-center.web.app` and `https://dtu-health-center.firebaseapp.com`.
  - **Conclusion:** GitHub is completely optional for deployment. However, if academic evaluators require a public code repository link, a GitHub remote can be linked anytime with `git remote add origin <url>` and `git push`.

---

### Q3: What is CI/CD (Continuous Integration & Continuous Deployment) with GitHub, and how does `git push` automatically update a live production website?
* **Core Concept:** 
  - In a modern WebOps workflow, developers do not manually FTP or copy files to servers. Instead, they use a **CI/CD Pipeline** (e.g. GitHub Actions, Vercel Git Integration, Netlify Build Hooks).
* **How `git push` Triggers Automated Live Updates:**
  1. **Developer Action:** The developer makes code changes locally and runs `git push origin master`.
  2. **Webhook Event:** GitHub receives the new commit and fires a `push` webhook event payload.
  3. **Build & Edge Deployment:** 
     - If using **Vercel / Netlify**: The cloud provider intercepts the webhook, pulls the changed HTML/CSS/JS, runs edge CDN caching invalidation, and deploys the new build within seconds.
     - If using **Firebase Hosting with GitHub Actions**: A workflow file (`.github/workflows/firebase-hosting-merge.yml`) automatically executes `firebase-tools deploy` in a headless Ubuntu runner on GitHub's cloud.
  4. **Zero-Downtime Rollout:** The global CDN updates atomically, ensuring users worldwide see the latest version instantly with zero downtime.
* **Viva Key Takeaway:** "We use Git-triggered CI/CD so that every code commit pushed to the GitHub master branch automatically synchronizes and deploys directly to production."

---

### Q4: Can Authentication and Firebase Database work seamlessly when hosted on Vercel? How do they interact in a Decoupled Architecture?
* **Direct Answer:** **Yes, 100%!** In fact, pairing **Vercel (Frontend)** with **Google Firebase (Backend/Auth/Database)** is an industry-standard modern web architecture known as **Jamstack / Decoupled 3-Tier Architecture**.
* **Architectural Division of Responsibilities:**
  1. **Vercel (Frontend Presentation Tier):**
     - Hosts the compiled HTML5, CSS3, assets, and client-side JavaScript.
     - Delivers files instantly worldwide using Vercel's Anycast Edge Network with automated GitHub CI/CD git push deployments.
     - Does **not** manage databases or user passwords; its sole job is lightning-fast asset delivery.
  2. **Firebase (Data & Authentication Tier - BaaS):**
     - When a student or doctor logs into the portal on `https://dtu-health-center.vercel.app`, the client-side Firebase SDK running in their web browser directly initiates a TLS/HTTPS handshake with Google Cloud servers (`identitytoolkit.googleapis.com` and `firestore.googleapis.com`).
     - Firebase verifies credentials, returns signed JWT session tokens, and streams real-time Firestore database snapshots.
     - Vercel does not block or intercept this traffic because the communication happens directly between the user's browser client and Google's cloud infrastructure.
* **Key Configuration Detail (Authorized Domains):**
  - In Firebase Console (`Authentication -> Settings -> Authorized Domains`), you simply ensure that both `localhost` and your Vercel URL (e.g. `dtu-health-center.vercel.app`) are listed so Firebase allows OAuth redirects and sign-in requests from that origin.
* **Viva Key Takeaway:** "Vercel acts as our global Edge CDN for lightning-fast frontend delivery and GitHub-triggered CI/CD, while Google Firebase provides serverless Authentication and real-time Cloud Firestore database syncing. They operate completely in harmony without any server conflict."
