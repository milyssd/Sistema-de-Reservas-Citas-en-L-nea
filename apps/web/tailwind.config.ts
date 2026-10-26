import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        lake: 'var(--lake)',
        paper: 'var(--paper)',
        coral: 'var(--coral)',
        success: 'var(--success)',
      },
    },
  },
  plugins: [],
} satisfies Config;
