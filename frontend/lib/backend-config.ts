export const DEFAULT_PROD_API = "https://api-shin.interopmed.com";

export function getBackendBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Client-side in browser
    return (
      process.env.NEXT_PUBLIC_API_URL ||
      (window.location.hostname.includes("interopmed.com") ||
        window.location.hostname.includes("vercel.app") ||
        process.env.NODE_ENV === "production"
        ? DEFAULT_PROD_API
        : "http://127.0.0.1:8000")
    ).replace(/\/+$/, "");
  }

  // Server-side (SSR / Node.js)
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.SHIN_BACKEND_URL ||
    process.env.BACKEND_URL ||
    (process.env.NODE_ENV === "production" ? DEFAULT_PROD_API : "http://127.0.0.1:8000")
  ).replace(/\/+$/, "");
}
