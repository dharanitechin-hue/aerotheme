/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aerodark: "#070b14",
        aeropane: "#0d1527",
        aeroborder: "#1e293b",
        aeroglow: "#00f0ff",
        aerosafe: "#10b981",
        aerowarn: "#f59e0b",
        aerodanger: "#ef4444"
      },
      fontFamily: {
        mono: ["Consolas", "Courier New", "monospace"]
      }
    },
  },
  plugins: [],
}
