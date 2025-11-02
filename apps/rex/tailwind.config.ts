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
        'popover': '100',
        'canvas-toolbar': '95'
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        nav: {
          DEFAULT: 'hsl(var(--nav))',
          foreground: 'hsl(var(--nav-foreground))',
        },
        highlight: {
          DEFAULT: 'hsl(var(--highlight))',
          foreground: 'hsl(var(--highlight-foreground))',
        }
      },
      keyframes: {
        show: {
          '0%': { 
            opacity: '0',
            transform: 'translate(0, -0px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'none',
          }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(-10px)' },
          '50%': { transform: 'translateY(0)' },
        }
      },
      animation: {
        show: 'show 0.3s ease-in-out forwards',
        'fade-in': 'fade-in 1s ease-in-out forwards',
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