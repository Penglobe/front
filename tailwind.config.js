//tailwind.config.js

/** @type {import('tailwindcss').Config} */
const { Colors, Gradients } = require("./constants/Colors.cjs");

module.exports = {
  content: [
    "./app/**/*.{js,jsx}", // expo-router app 폴더
    "./App.{js,jsx}", // 루트 App
    "./App/**/*.{js,jsx}", // 루트 App
    "./index.js", // index 엔트리
    "./components/*.{js,jsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ...Colors,
        ...Gradients,
      },
      spacing: {
        pageX: "16px",
        66: "66px",
      },
      fontFamily: {
        sf: ["SFPro"],
        "sf-md": ["SFPro-Medium"],
        "sf-sb": ["SFPro-Semibold"],
        "sf-b": ["SFPro-Bold"],
        grotesk: ["SpaceGrotesk"],
        "grotesk-md": ["SpaceGrotesk-Medium"],
        "grotesk-b": ["SpaceGrotesk-Bold"],
        "grotesk-l": ["SpaceGrotesk-Light"],
      },
    },
  },
  plugins: [],
};
