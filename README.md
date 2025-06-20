# AstroCodePad

A modern, mobile-friendly web-based code editor built with Astro and React. Write, run, and get instant results for C++, Java, Python, JavaScript, and more—powered by the Judge0 API.

---

## ✨ Features
- Write and execute code in many languages (C++, Java, Python, JS, etc.)
- Beautiful, responsive UI (works great on mobile and desktop)
- Monaco Editor with syntax highlighting
- Output window with error reporting
- Floating AI chat bot (Mistral API)
- No backend/server required—deploy anywhere (Netlify, Vercel, etc.)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- [RapidAPI account](https://rapidapi.com/) for Judge0 API key
- [Mistral API key](https://mistral.ai/) for chat bot (optional, but recommended)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root of the project.
4. Add your API keys to the `.env` file:
   ```env
   PUBLIC_JUDGE0_API_KEY="YOUR_RAPIDAPI_KEY"
   PUBLIC_MISTRAL_API_KEY="YOUR_MISTRAL_API_KEY"
   ```

### Running Locally
```bash
npm run dev
```
Open your browser at [http://localhost:4321](http://localhost:4321)

---

## 🌍 Deploying to Netlify
1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repo on [Netlify](https://netlify.com/)
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Deploy!

---

## 🛠️ Technology Stack
- Astro
- React
- Monaco Editor
- Judge0 API (via RapidAPI)
- Bootstrap
- Mistral AI (for chat bot)

---

## 📱 Mobile Experience
- Editor and output stack vertically
- Floating chat button for easy access
- Touch-friendly controls and layout

---

## 🙏 Credits
- [Judge0](https://judge0.com/) for code execution API
- [Mistral AI](https://mistral.ai/) for chat bot
- [Astro](https://astro.build/) & [Monaco Editor](https://microsoft.github.io/monaco-editor/)

---

## License
MIT