// app.json holds the config; this only derives the Google Sign-In plugin's
// iOS URL scheme from EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, which a static
// app.json can't read. See docs/google-sign-in.md.
const GOOGLE_SIGNIN_PLUGIN = "@react-native-google-signin/google-signin";

module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  // Without it the Google button on iOS fails at runtime - refuse the EAS
  // build rather than ship that to App Review.
  if (!iosClientId && process.env.EAS_BUILD_PLATFORM === "ios") {
    throw new Error("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must be set for iOS builds (see docs/google-sign-in.md)");
  }

  const plugins = config.plugins.map((plugin) =>
    plugin === GOOGLE_SIGNIN_PLUGIN && iosClientId
      ? [
          plugin,
          {
            // The reversed client id: "123-abc.apps.googleusercontent.com"
            // -> "com.googleusercontent.apps.123-abc".
            iosUrlScheme: `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, "")}`,
          },
        ]
      : plugin
  );

  return { ...config, plugins };
};
