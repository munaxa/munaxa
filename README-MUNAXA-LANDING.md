# Munaxa Coming Soon Landing Page

A premium, bilingual (English/Arabic) coming soon landing page for **Munaxa** — The School Operating System.

## 🎨 Design Overview

This implementation replicates the original design with pixel-perfect fidelity:

### Color Palette
- **Background**: `#0B0518` (Deep purple-black)
- **Primary Purple**: `#7A3FFF` → `#B97BFF` (Gradient)
- **Accent Aqua**: `#4DF4E1` (Success states, status pill)
- **Accent Coral**: `#FF8E6E` (Eyebrow text, gradient endpoint)
- **Text Primary**: `#F4F0FF`
- **Text Muted**: `#B5ACD4`
- **Text Dim**: `#8B83A8`

### Typography
- **Display (Headlines)**: Sora
- **Body**: Inter
- **Mono (Labels, chips)**: JetBrains Mono
- **Arabic Display**: Tajawal
- **Arabic Body**: IBM Plex Sans Arabic

### Key Visual Elements
1. **Ambient Background**: Three animated gradient blobs drifting slowly
2. **Grid Overlay**: Subtle grid texture with radial mask
3. **Glassmorphism**: Translucent cards and inputs with soft borders
4. **Gradient Text**: Headline with purple-to-aqua gradient
5. **Status Pill**: Pulsing aqua indicator with "Launching soon"

## 📦 Dependencies

```json
{
  "react": "^18.x",
  "next": "^14.x",
  "tailwindcss": "^3.x",
  "framer-motion": "^11.x",
  "lucide-react": "^0.x"
}
```

## 🚀 Installation & Setup

### Option 1: Add to Existing Next.js Project

1. **Install dependencies:**
   ```bash
   npm install framer-motion lucide-react
   ```

2. **Copy the component:**
   - Copy `munaxa-landing-page.tsx` to your components directory
   - Import and use in your page:

   ```tsx
   // app/page.tsx
   import MunaxaComingSoon from '@/components/munaxa-landing-page';

   export default function Home() {
     return <MunaxaComingSoon />;
   }
   ```

3. **Update Tailwind config** (if needed):
   ```js
   // tailwind.config.js
   module.exports = {
     content: [
       './pages/**/*.{js,ts,jsx,tsx,mdx}',
       './components/**/*.{js,ts,jsx,tsx,mdx}',
       './app/**/*.{js,ts,jsx,tsx,mdx}',
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```

### Option 2: Create New Next.js Project

```bash
npx create-next-app@latest munaxa-landing --typescript --tailwind --eslint --app
cd munaxa-landing
npm install framer-motion lucide-react
```

Then copy the component file and set it up as shown above.

## ✨ Features

### 1. Bilingual Support (EN/AR)
- Toggle between English and Arabic
- Automatic RTL/LTR layout switching
- LocalStorage persistence for language preference
- Proper Arabic typography with Tajawal font

### 2. Email Capture Form
- Real-time email validation
- Loading state with spinner animation
- Success state with checkmark
- Error state with coral-colored feedback
- Mock API call with 1-second delay (ready for Supabase integration)

### 3. Premium Animations
- Staggered fade-up entrance animations
- Smooth hover transitions on buttons
- Animated background blobs
- Pulsing status indicator
- Reduced motion support for accessibility

### 4. Responsive Design
- Mobile-first approach
- Fluid typography with clamp()
- Stacked layout on small screens
- Touch-friendly tap targets

### 5. Accessibility
- Semantic HTML structure
- ARIA labels on interactive elements
- Focus states on form inputs
- Keyboard navigation support
- Reduced motion media query

## 🔧 Customization

### Connecting to Supabase

Replace the mock `handleSubmit` function with real Supabase integration:

```tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

// In handleSubmit:
const { data, error } = await supabase
  .from('early_access')
  .insert([{ email: email.trim() }]);

if (error) throw error;
```

### Modifying Colors

All colors are hardcoded as Tailwind arbitrary values (e.g., `[#7A3FFF]`). To customize:

1. Add to `tailwind.config.js`:
   ```js
   theme: {
     extend: {
       colors: {
         munaxa: {
           bg: '#0B0518',
           primary: '#7A3FFF',
           primary2: '#B97BFF',
           aqua: '#4DF4E1',
           coral: '#FF8E6E',
         }
       }
     }
   }
   ```

2. Replace arbitrary values: `[#7A3FFF]` → `munaxa-primary`

### Adding More Languages

Extend the `Translations` interface:

```tsx
interface Translations {
  launchingSoon: {
    en: string;
    ar: string;
    fr: string; // Add French
  };
  // ... other keys
}
```

Update the `Language` type and add translations.

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📄 File Structure

```
/workspace/
├── munaxa-landing-page.tsx    # Main component (copy this)
├── README.md                   # This file
└── coming-soon/
    └── index.html             # Original reference design
```

## 🎯 Usage Examples

### Basic Usage
```tsx
import MunaxaComingSoon from './munaxa-landing-page';

export default function Page() {
  return <MunaxaComingSoon />;
}
```

### With Custom Layout
```tsx
export default function Page() {
  return (
    <main>
      <MunaxaComingSoon />
    </main>
  );
}
```

## 🧪 Testing the Form

The form includes a mock backend simulation:

1. Enter any valid email (e.g., `test@example.com`)
2. Click "Notify me"
3. Watch the loading spinner for 1 second
4. See the success message

To test error states:
- Submit without an email
- Submit with invalid email (e.g., `notanemail`)

## 📝 Notes

- The component uses `'use client'` directive for interactivity
- All animations use Framer Motion for smooth performance
- Font imports are included via styled-jsx global styles
- The component is fully self-contained with no external CSS files needed

## 🙏 Credits

Design based on the original Munaxa coming soon template by the Munaxa team.

---

**Built with ❤️ for Munaxa — The School Operating System**
