// Site-wide settings. Override with environment variables (see .env.example).

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "ChatSpark"; // change if your final brand name differs
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://chatsparkrc.com").replace(/\/$/, "");
// "same-origin" means the chat server is reachable on the same address as the website (one reverse proxy or
// tunnel in front of both). It becomes an empty string here and the chat client then connects to the page's own origin.
const rawServerUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";
export const SERVER_URL = rawServerUrl === "same-origin" ? "" : rawServerUrl.replace(/\/$/, "");
export const SOCKET_PATH = process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@example.com";
// The default above is a placeholder; legal pages and the footer only show an address once a real one is set.
export const HAS_CONTACT = !/@example\.(com|org|net)$/i.test(CONTACT_EMAIL);
