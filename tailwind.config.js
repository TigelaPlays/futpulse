/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0d1117",
          card: "#161b22",
          border: "#30363d",
          accent: "#22c55e",
        },
      },
    },
  },
  plugins: [],
}