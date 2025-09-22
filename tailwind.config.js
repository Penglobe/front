//tailwind.config.js

/** @type {import('tailwindcss').Config} */
const { Colors, Gradients } = require("./constants/Colors.cjs");
const { spacing } = require("./constants/Design.cjs");

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
        none: `${spacing.none}px`,
        xxs: `${spacing.xxs}px`,
        xs: `${spacing.xs}px`,
        sm: `${spacing.sm}px`,
        md: `${spacing.md}px`,
        lg: `${spacing.lg}px`,
        llg: `${spacing.llg}px`,
        xl: `${spacing.xl}px`,
        "2xl": `${spacing["2xl"]}px`,
        "3xl": `${spacing["3xl"]}px`,
        "4xl": `${spacing["4xl"]}px`,
        "5xl": `${spacing["5xl"]}px`,
        "6xl": `${spacing["6xl"]}px`,
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
      fontSize: {
        h0: ["80", { lineHeight: "86px" }],
        h1: ["24", { lineHeight: "30px" }],
        h2: ["20", { lineHeight: "26px" }],
        h3: ["18", { lineHeight: "24px" }],
        h4: ["16", { lineHeight: "22px" }],

        bodyLg: ["18", { lineHeight: "26px" }],
        body: ["16", { lineHeight: "22px" }],
        bodySm: ["14", { lineHeight: "20px" }],

        label: ["14", { lineHeight: "20px" }],
        button: ["16", { lineHeight: "22px" }],

        caption: ["12", { lineHeight: "16px" }],
        footnote: ["11", { lineHeight: "15px" }],
        overline: ["10", { lineHeight: "14px" }],
      },
    },
  },
  plugins: [],
};
