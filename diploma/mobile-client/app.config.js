const appJson = require("./app.json");

module.exports = {
  ...appJson.expo,
  extra: {
    ...(appJson.expo.extra || {}),
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "https://rent-service-app.onrender.com"
  }
};
