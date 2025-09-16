import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: false,
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-heading)', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        brand: {
          50: '#f3f8ff',
          100: '#e6f1ff',
          200: '#c4deff',
          300: '#9bc7ff',
          400: '#6aa9ff',
          500: '#3b8bff',
          600: '#1f6fe6',
          700: '#1958b4',
          800: '#163f7f',
          900: '#122d59',
        },
        success: {
          500: '#16a34a'
        },
        warning: {
          500: '#f59e0b'
        }
      },
      borderRadius: {
        lg: '12px'
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
