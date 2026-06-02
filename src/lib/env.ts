const REMOTE_API_BASE_URL = "https://excess-seana-felix-glucode-0704cdd3.koyeb.app";
const LOCAL_API_BASE_URL = "http://localhost:3000";

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function toCableUrl(apiBaseUrl: string): string {
  const cableBaseUrl = apiBaseUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  return `${cableBaseUrl}/cable`;
}

export const API_BASE_URL = stripTrailingSlashes(
  import.meta.env.VITE_API_BASE_URL ??
    (import.meta.env.DEV ? LOCAL_API_BASE_URL : REMOTE_API_BASE_URL)
);

export const ACTION_CABLE_URL =
  import.meta.env.VITE_ACTION_CABLE_URL ?? toCableUrl(API_BASE_URL);
