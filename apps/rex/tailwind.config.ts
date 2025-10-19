import type { Config } from 'tailwindcss';

const config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    containter: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      zIndex: {
      }
    }
  },
  plugins: [
    require('tailwindcss-animate'),

    function ({ addComponents }: { addComponents: Function }) {
      const newComponents = {
        '.canvas-mode': {
          touchAction: 'none',
          overscrollBehavior: 'none',
        }
      };

      addComponents(newComponents);
    },
  ]
} satisfies Config;

export default config;