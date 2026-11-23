const SENSITIVE_KEY = /password|passwd|secret|token|authorization|cookie|refresh|email|phone/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER = /Bearer\s+\S+/gi;

/** Strips secrets and contact data before a log line or a prompt leaves the process. */
export function redact(value: unknown): unknown {
    if (typeof value === "string") {
        return value.replace(BEARER, "Bearer [redacted]").replace(EMAIL, "[redacted]");
    }
    if (value instanceof Error) return redact(value.message);
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            out[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : redact(item);
        }
        return out;
    }
    return value;
}

export function redactPrompt(text: string): string {
    return String(redact(text));
}

export function logError(message: string, detail?: unknown): void {
    try {
        if (detail === undefined) console.error(message);
        else console.error(message, redact(detail));
    } catch {
        // A log failure must not change the request.
    }
}
