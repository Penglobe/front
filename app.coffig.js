import "dotenv/config";

export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      SERVER_URL:
        process.env.SERVER_URL || "https://penglobe.shinhanacademy.co.kr",
    },
  };
};
