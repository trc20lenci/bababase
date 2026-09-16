import type { CapacitorConfig } from "@capacitor/cli";

/**
 * IMPORTANT — read before building for release:
 *
 * 1. `appId` becomes your app's permanent package name on Google Play.
 *    It CANNOT be changed after your first upload. Pick it deliberately
 *    (reverse-domain style, e.g. "com.yourcompany.base").
 *
 * 2. `server.url` must point at your deployed BASE web app (the actual
 *    Next.js site running in production — e.g. on Vercel). This shell
 *    does not bundle the app locally; it's a WebView that loads your
 *    live site full-screen, so the site must be deployed and reachable
 *    over HTTPS before the Android app is usable.
 */
const config: CapacitorConfig = {
	appId: "com.base.app",
	appName: "BASE",
	webDir: "www",
	server: {
		url: "https://your-deployed-domain.example.com/studio",
		cleartext: false,
	},
	android: {
		backgroundColor: "#050607",
	},
	plugins: {
		SplashScreen: {
			launchShowDuration: 400,
			backgroundColor: "#050607",
			androidSplashResourceName: "splash",
			showSpinner: false,
		},
		StatusBar: {
			style: "DARK",
			backgroundColor: "#050607",
		},
	},
};

export default config;
