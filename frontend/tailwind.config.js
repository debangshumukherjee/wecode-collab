/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0d1117',       // GitHub Dark Dimmed Background
          panel: '#161b22',    // GitHub Dark Panel
          border: '#30363d',   // GitHub Dark Border
          text: '#c9d1d9',     // GitHub Dark Text
        }
      }
    },
  },
  plugins: [],
}