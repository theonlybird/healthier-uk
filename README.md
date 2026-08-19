# Healthier UK Website (`www.healthieruk.org`)

A clean, modern, accessible, and responsive website rebuilt from scratch using pure HTML5, CSS3, and lightweight vanilla JavaScript.

---

## 🌟 Overview

**Healthier UK** is a UK-wide coalition initiated by the **College of Medicine** and the **British Society of Lifestyle Medicine**, dedicated to creating the conditions for health across England, Scotland, Wales, and Northern Ireland.

This codebase replaces the legacy builder site with a fast, self-contained, and customizable static website ready to be version-controlled with Git and deployed to any static hosting provider.

---

## 📁 Project Structure

```
healthier-uk/
├── index.html                           # Homepage (Hero, Pillars, Policy, Gallery, Contact)
├── about-us.html                        # About Us & Mission statement
├── team.html                            # Leadership & Coalition Members
├── news.html                            # News & Events overview
├── news-launch-westminster.html         # News: Westminster Parliamentary Launch
├── news-parliamentary-launch.html       # News: Parliamentary Launch (England)
├── news-meeting-rcgp.html               # News: RCGP 30 Euston Sq Meeting
├── news-meeting-richmond.html           # News: Paradise Rd Richmond Meeting
├── blogs.html                           # Blogs directory
├── blog-welcome.html                    # Welcome blog by Dr William Bird MBE
├── wales.html                           # Wales: Community Capacity Report & Reflections
├── scotland.html                        # Scotland Overview
├── england.html                         # England Overview & Focus Hub
├── arms-length-bodies.html              # England: Arms Length Bodies
├── parliamentary-launch.html            # England: Parliamentary Launch
├── combined-authorities.html            # England: Mayoral Combined Authorities
├── west-midlands.html                   # England: West Midlands Case Study
├── neighbourhood-health.html            # England: Neighbourhood Health
├── northern-ireland.html                # Northern Ireland Overview
├── research-portal.html                 # Research Portal & Evidence Base
├── contact.html                         # Contact & Inquiry Form
├── assets/
│   ├── css/
│   │   └── style.css                    # Unified design system, CSS variables & responsive layout
│   ├── js/
│   │   └── main.js                      # Navigation drawer, dropdowns, lightbox, and forms
│   └── images/                          # Authentic logos, team photos, hero and gallery assets
├── .gitignore                           # Git ignore rules
└── README.md                            # Documentation and deployment guide
```

---

## 🚀 Running Locally

Because this site is built with pure static HTML, CSS, and JS, no complex build steps or node modules are required!

### Option 1: Double-click
Open `index.html` directly in any web browser (Chrome, Safari, Firefox, Edge).

### Option 2: Local HTTP Server (Recommended)
From this directory, start a lightweight Python web server:
```bash
python3 -m http.server 8000
```
Then visit [`http://localhost:8000`](http://localhost:8000) in your browser.

---

## 🌐 Deploying to GitHub & GitHub Pages

To upload this project to your GitHub repository and publish it:

1. **Initialize Git repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Rebuild Healthier UK website with HTML/CSS/JS"
   ```

2. **Connect to your GitHub repo**:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository settings on GitHub &rarr; **Pages**.
   - Under **Build and deployment**, select **Deploy from a branch**.
   - Choose `main` branch and `/ (root)` folder, then click **Save**.
   - Your website will be live in seconds at `https://<your-username>.github.io/<your-repo-name>/`.

---

## 🎨 Customizing Styles & Content

- **Colors & Typography**: Modify CSS variables in [`assets/css/style.css`](assets/css/style.css) under `:root`.
- **Navigation Links**: Edit the `<header>` block in any `.html` file.
- **Images**: Place any new images in `assets/images/`.
- **Forms**: To route contact form submissions to your email, you can integrate [Formspree](https://formspree.io) by setting `action="https://formspree.io/f/YOUR_FORM_ID"` in `<form>`.

---

## 📄 License & Attribution

&copy; 2026 Healthier UK. Initiated by College of Medicine &amp; British Society of Lifestyle Medicine.
