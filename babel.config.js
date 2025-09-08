module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@app": "./app",
            "@tabs": "./app/(tabs)",
            "@pages": "./app/pages",
            "@components": "./components",
            "@assets": "./assets",
            "@constants": "./constants",
            "@hooks": "./hooks",
            "@styles": "./styles",
            "@services": "./services",
            "@utils": "./utils",
            "@auth": "./app/auth",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
