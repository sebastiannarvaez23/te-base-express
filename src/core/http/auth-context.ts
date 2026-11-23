import { Request } from "express";

import { ACCESS_ADMIN_COOKIE, ACCESS_CLIENT_COOKIE, readCookie } from "./cookies";

export type AuthContext = "admin" | "client";

/** Both cookies can arrive together. The header says which session this call uses. */
export function resolveAuthContext(req: Request): AuthContext | undefined {
    const raw = req.headers?.["x-auth-context"];
    const header = (Array.isArray(raw) ? raw[0] : raw || "").toLowerCase();
    if (header === "admin" || header === "client") return header;
    const admin = readCookie(req.headers.cookie, ACCESS_ADMIN_COOKIE);
    const client = readCookie(req.headers.cookie, ACCESS_CLIENT_COOKIE);
    if (admin && client) return undefined;
    if (admin) return "admin";
    if (client || req.headers.authorization) return "client";
    return undefined;
}

export function accessTokenFromRequest(req: Request, context: AuthContext | undefined): string | undefined {
    const bearer = req.headers.authorization?.split(" ")[1];
    if (bearer) return bearer;
    if (context === "admin") return readCookie(req.headers.cookie, ACCESS_ADMIN_COOKIE);
    return readCookie(req.headers.cookie, ACCESS_CLIENT_COOKIE);
}
