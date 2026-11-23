/** Public HTTP prefix. Empty API_VERSION still mounts `/api/v1`. */
export function apiPrefix(): string {
    const raw = (process.env.API_VERSION || "").trim();
    return raw || "/api/v1";
}
