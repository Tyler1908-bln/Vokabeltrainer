import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true
    },
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: [
                "icon.svg",
                "apple-touch-icon-180.png",
                "pwa-192x192.png",
                "pwa-512x512.png",
                "maskable-icon-512x512.png"
            ],
            workbox: {
                cleanupOutdatedCaches: true,
                navigateFallback: "index.html",
                globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"]
            },
            manifest: {
                id: "/",
                name: "Vocabito",
                short_name: "Vocabito",
                description: "Installierbarer Spanisch-Vokabeltrainer für Schüler.",
                theme_color: "#1cb0f6",
                background_color: "#d7f1ff",
                display: "standalone",
                display_override: ["standalone", "window-controls-overlay"],
                orientation: "portrait",
                start_url: "/",
                icons: [
                    {
                        src: "/pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any"
                    },
                    {
                        src: "/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any"
                    },
                    {
                        src: "/maskable-icon-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable"
                    }
                ]
            }
        })
    ]
});
