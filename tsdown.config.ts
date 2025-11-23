import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/plugins/spatial.ts"],
	format: "esm",
	platform: "browser",
	unbundle: false, // Bundle core library, but plugins stay separate
	hash: false,
	treeshake: true,
	minify: {
		compress: true,
		mangle: true,
	},
	publint: true,
	attw: {
		profile: "esmOnly",
	},
	report: true,
	banner: {
		js: "// howler.js v3.0.0-alpha.1\n// howlerjs.com\n// (c) 2013-2025, James Simpson of GoldFire Studios\n// goldfirestudios.com\n// MIT License\n",
	}, 
	// Target browsers that support ES modules natively
	// Chrome 61+, Firefox 60+, Safari 11+, Edge 16+, Opera 48+
	target: ["chrome61", "firefox60", "safari11", "edge16", "opera48"],
});
