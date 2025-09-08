import "dotenv/config";

export default ({ config }) => ({
  ...config,
  extra: {
    SERVER_URL: process.env.SERVER_URL,
  },
});
