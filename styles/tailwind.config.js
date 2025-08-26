//tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}", // expo-router app 폴더
    "./App.{js,jsx}", // 루트 App
    "./App/**/*.{js,jsx}", // 루트 App
    "./index.js", // index 엔트리
  ],
  presets: [require("nativewind/preset")],
  theme: { extend: {} },
  plugins: [],
};
