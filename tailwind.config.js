/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2fbf5",
          100: "#def7e7",
          200: "#b9ecd0",
          300: "#86dbb1",
          400: "#4bc68a",
          500: "#1faa67",
          600: "#148a53",
          700: "#116f45",
          800: "#0f5939",
          900: "#0d4a31"
        }
      },
      boxShadow: {
        soft: "0 6px 18px rgba(16, 24, 40, 0.08)",
        float: "0 10px 28px rgba(16, 24, 40, 0.14)"
      },
      fontFamily: {
        display: ["'Manrope'", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
