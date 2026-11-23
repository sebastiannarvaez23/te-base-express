import { Response } from "express";

export const ACCESS_CLIENT_COOKIE = "access_client";
export const REFRESH_CLIENT_COOKIE = "refresh_client";
export const DEVICE_CLIENT_COOKIE = "device_client";
export const ACCESS_ADMIN_COOKIE = "access_admin";
export const REFRESH_ADMIN_COOKIE = "refresh_admin";

export type AuthCookieKind = "access" | "refresh" | "device";

export function authCookieName(kind: AuthCookieKind, admin = false): string {
    if (kind === "device") return DEVICE_CLIENT_COOKIE;
    if (admin) return kind === "access" ? ACCESS_ADMIN_COOKIE : REFRESH_ADMIN_COOKIE;
    return kind === "access" ? ACCESS_CLIENT_COOKIE : REFRESH_CLIENT_COOKIE;
}

export function cookieOptions(maxAgeSeconds?: number) {
    const options: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: "lax";
        domain: string;
        path: string;
        maxAge?: number;
    } = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        domain: process.env.AUTH_COOKIE_DOMAIN || ".base.local",
        path: "/",
    };
    if (maxAgeSeconds !== undefined) options.maxAge = maxAgeSeconds * 1000;
    return options;
}

export function readCookie(header: string | undefined, name: string): string | undefined {
    if (!header) return undefined;
    for (const part of header.split(";")) {
        const [rawKey, ...rest] = part.trim().split("=");
        if (rawKey === name) return decodeURIComponent(rest.join("="));
    }
    return undefined;
}

export function writeAuthCookie(res: Response, name: string, value: string, maxAgeSeconds?: number): void {
    if (typeof res.cookie !== "function") return;
    res.cookie(name, value, cookieOptions(maxAgeSeconds));
}

export function clearAuthCookie(res: Response, name: string): void {
    if (typeof res.clearCookie !== "function") return;
    res.clearCookie(name, cookieOptions());
}

export function writeClientSessionCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    persistent: boolean,
    accessSeconds: number,
    refreshSeconds: number,
): void {
    writeAuthCookie(res, ACCESS_CLIENT_COOKIE, accessToken, persistent ? accessSeconds : undefined);
    writeAuthCookie(res, REFRESH_CLIENT_COOKIE, refreshToken, persistent ? refreshSeconds : undefined);
}

export function clearClientSessionCookies(res: Response): void {
    clearAuthCookie(res, ACCESS_CLIENT_COOKIE);
    clearAuthCookie(res, REFRESH_CLIENT_COOKIE);
}

export function writeAdminSessionCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    persistent: boolean,
    accessSeconds: number,
    refreshSeconds: number,
): void {
    writeAuthCookie(res, ACCESS_ADMIN_COOKIE, accessToken, persistent ? accessSeconds : undefined);
    writeAuthCookie(res, REFRESH_ADMIN_COOKIE, refreshToken, persistent ? refreshSeconds : undefined);
}

export function clearAdminSessionCookies(res: Response): void {
    clearAuthCookie(res, ACCESS_ADMIN_COOKIE);
    clearAuthCookie(res, REFRESH_ADMIN_COOKIE);
}
