import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Latte/Warm palette
                latte: {
                    50: "#faf9f7",
                    100: "#f5f0e8",
                    200: "#e8ddd0",
                    300: "#d4c5b0",
                    400: "#c8a97e",
                    500: "#b8966a",
                    600: "#9a7a52",
                    700: "#7d6242",
                    800: "#5c4830",
                    900: "#3d2f1f",
                },
                rose: {
                    soft: "#f9e8e8",
                    blush: "#e8c4c4",
                    muted: "#c9a5a5",
                },
                cream: "#faf9f7",
                "glass-white": "rgba(255,255,255,0.7)",
            },
            fontFamily: {
                sans: [
                    "Plus Jakarta Sans",
                    "Inter",
                    "-apple-system",
                    "BlinkMacSystemFont",
                    "SF Pro Text",
                    "sans-serif",
                ],
            },
            backdropBlur: {
                xs: "2px",
            },
            borderRadius: {
                "4xl": "2rem",
                "5xl": "2.5rem",
            },
            boxShadow: {
                glass: "0 8px 32px 0 rgba(200, 169, 126, 0.15)",
                "glass-lg": "0 16px 48px 0 rgba(200, 169, 126, 0.2)",
                soft: "0 4px 20px 0 rgba(0, 0, 0, 0.06)",
                "soft-lg": "0 8px 40px 0 rgba(0, 0, 0, 0.08)",
                card: "0 2px 12px 0 rgba(200,169,126,0.12), 0 1px 3px 0 rgba(0,0,0,0.04)",
            },
            animation: {
                "fade-in": "fadeIn 0.3s ease-out",
                "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-down": "slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                "scale-in": "scaleIn 0.2s ease-out",
                shimmer: "shimmer 2s infinite",
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                slideUp: {
                    from: { opacity: "0", transform: "translateY(24px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                slideDown: {
                    from: { opacity: "0", transform: "translateY(-12px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                scaleIn: {
                    from: { opacity: "0", transform: "scale(0.95)" },
                    to: { opacity: "1", transform: "scale(1)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
            },
            spacing: {
                "safe-bottom": "env(safe-area-inset-bottom)",
                "safe-top": "env(safe-area-inset-top)",
            },
        },
    },
    plugins: [],
};

export default config;
