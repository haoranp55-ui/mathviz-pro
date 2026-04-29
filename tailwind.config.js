/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: '#0F172A',
          panel: '#1E293B',
          input: '#334155',
          grid: '#475569',
        },
        curve: {
          1: '#60A5FA',
          2: '#34D399',
          3: '#F472B6',
          4: '#FBBF24',
          5: '#A78BFA',
          6: '#F87171',
          7: '#22D3EE',
          8: '#FB923C',
        }
      }
    },
  },
  plugins: [],
}
