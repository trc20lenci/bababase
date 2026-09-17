import type { CapacitorConfig } from "@capacitor/cli";

/**
 * IMPORTANT — read before building for release:
 *
 * 1. `appId` becomes your app's permanent package name on Google Play.
 *    It CANNOT be changed after your first upload. Pick it deliberately
 *    (reverse-domain style, e.g. "com.yourcompany.base").
 *
 * 2. `server.url` below is set for LOCAL TESTING over a USB-connected
 *    phone: `bun run dev:web` on your computer, `adb reverse tcp:3000
 *    tcp:3000` to bridge the port over USB, then the phone's
 *    "localhost:3000" reaches your computer's dev server. See
 *    apps/mobile/README.md for the full walkthrough.
 *
 *    Before a real release build, swap this to your deployed production
 *    domain (e.g. https://your-app.vercel.app/studio) — this shell
 *    doesn't bundle the app locally, it's a WebView pointed at a URL.
 */
const config: CapacitorConfig = {
	appId: "com.base.app",
	appName: "BASE",
	webDir: "www",
	server: {
		url: "http://localhost:3000/studio",
		cleartext: true,
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
