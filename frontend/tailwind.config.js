/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        risk: {
          low: "#10B981",       // emerald-500
          moderate: "#F59E0B",  // amber-500
          high: "#F97316",      // orange-500
          extreme: "#EF4444",   // red-500
          critical: "#EF4444",  // red-500
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        }
      },
    },
  },
  plugins: [],
}
