import type { Metadata, Viewport } from "next";
import { SITE_INFO, SITE_URL } from "@/constants/site-constants";

export const baseMetaData: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: SITE_INFO.title,
	description: SITE_INFO.description,
	openGraph: {
		title: SITE_INFO.title,
		description: SITE_INFO.description,
		url: SITE_URL,
		siteName: SITE_INFO.title,
		locale: "en_US",
		type: "website",
		images: [
			{
				url: SITE_INFO.openGraphImage,
				width: 1200,
				height: 630,
				alt: "BASE Wordmark",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: SITE_INFO.title,
		description: SITE_INFO.description,
		creator: "@base",
		images: [SITE_INFO.twitterImage],
	},
	pinterest: {
		richPin: false,
	},
	robots: {
		index: false,
		follow: false,
	},
	icons: {
		icon: [
			{ url: "/favicon.ico" },
			{ url: "/icon-192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icon-512.png", sizes: "512x512", type: "image/png" },
		],
		apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
		shortcut: ["/favicon.ico"],
	},
	appleWebApp: {
		capable: true,
		title: SITE_INFO.title,
		statusBarStyle: "black-translucent",
	},
	manifest: "/manifest.json",
	other: {
		"msapplication-config": "/browserconfig.xml",
		"mobile-web-app-capable": "yes",
	},
};

export const baseViewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
	themeColor: "#00CAE0",
};
