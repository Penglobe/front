module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: ".env",
          blocklist: null,
          allowlist: null,
          safe: false,
          allowUndefined: true,
        },
      ],
      [
        "module-resolver",
        {
          root: ["./app"], // app 폴더를 절대 경로의 시작점으로 설정
          alias: {
            "@": "./app", // "@/..." 형태로 import 가능
            "@tabs": "./app/(tabs)", // "@tabs/..." 형태
            "@components": "./app/components", // "@components/..." 형태
            "@styles": "./app/styles", // "@styles/..." 형태
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
