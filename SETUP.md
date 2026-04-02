# i-Human Patient Sim - Setup

## Quick Start (for teammates)

### Prerequisites
- Node.js installed (v18+)

### Steps

1. Create a new project folder and open terminal there

2. Run these commands:
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install lucide-react
```

3. Replace `src/App.tsx` with the `ihuman-sim-v1.tsx` file (rename it to `App.tsx`)

4. Replace `src/main.tsx` with:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

5. Place `patient.jpg` and `logo.png` in the `public/` folder (create it if needed)

6. Run:
```bash
npm run dev
```

7. Open http://localhost:5173

### Files needed
- `ihuman-sim-v1.tsx` - The main app component (rename to App.tsx)
- `public/patient.jpg` - Patient background image
- `public/logo.png` - i-Human logo

### Or use Claude Code
Give Claude this prompt along with the `ihuman-sim-v1.tsx` file:
> "Set up a Vite React TypeScript project and use this file as the App component. Install lucide-react. Run the dev server."
