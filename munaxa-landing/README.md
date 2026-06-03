# Munaxa Landing Page

A premium "Coming Soon" landing page for **Munaxa** — a comprehensive School OS platform.

## Design System Reference

This implementation is based on the **Munaxa Design System (2).html** template, extracting:

### Color Palette
- **Background**: Deep midnight purple (`#0B0518`) with elevated surfaces
- **Brand**: Primary purple (`#7A3FFF`) with gradient to lighter purple (`#B97BFF`) and coral (`#FF8E6E`)
- **Accents**: Neon aqua (`#4DF4E1`) for success states, Coral for warnings
- **Text**: White-purple (`#F4F0FF`) for headings, muted purple for body text

### Typography
- **Display**: Sora (headlines, prices, stats)
- **Body**: Inter (paragraphs, buttons, form fields)
- **Mono**: JetBrains Mono (labels, captions, data)

### Visual Effects
- Glassmorphism with subtle blur
- Soft glow shadows with negative spread
- Radial gradient backgrounds for depth
- Smooth entrance animations

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** (custom design tokens)
- **Framer Motion** (entrance animations)
- **Lucide React** (icons)

## Project Structure

```
munaxa-landing/
├── src/
│   └── app/
│       ├── globals.css      # Global styles & component utilities
│       ├── layout.tsx       # Root layout with metadata
│       └── page.tsx         # Main landing page component
├── tailwind.config.ts       # Design system tokens
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

```bash
cd munaxa-landing
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Features

### Email Subscription Form
- Real-time email validation
- Loading state with spinner
- Success state with checkmark
- Error state with alert icon
- Mock API with 1-second delay

### Animations
- Staggered fade-up entrance for hero content
- Scroll-triggered animations for features section
- Hover effects on cards and buttons
- Smooth transitions between form states

### Responsive Design
- Mobile-first approach
- Breakpoints at 640px, 768px, 1024px
- Stacked layout on mobile, side-by-side on desktop
- Fluid typography using clamp()

## Components

### Button Variants
- `.btn-primary` - Gradient CTA button with glow
- `.btn-ghost` - Glassmorphism secondary button

### Card Component
- `.card` - Gradient background card with border and shadow

### Icon Boxes
- `.icon-box` - Default purple variant
- `.icon-box.aqua` - Aqua accent variant
- `.icon-box.coral` - Coral accent variant

### Badge/Chip
- `.chip-badge` - Coming soon badge with animated dot

## Customization

To modify colors, update `tailwind.config.ts`:

```typescript
colors: {
  munaxa: {
    bg: "#0B0518",      // Change background
    primary: "#7A3FFF", // Change primary brand color
    // ...
  }
}
```

## License

© 2026 Munaxa. All rights reserved.
