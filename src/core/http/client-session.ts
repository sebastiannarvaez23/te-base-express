import { createHash, randomBytes } from "crypto";
import jwt from "jsonwebtoken";

export interface KeyValueStore {
    setRaw(key: string, value: string, ttlSeconds: number): Promise<void>;
    getRaw(key: string): Promise<string | null>;
    deleteRaw(key: string): Promise<void>;
}

export interface IssuedSession {
    accessToken: string;
    refreshToken: string;
    persistent: boolean;
    sid: string;
}

export type SessionSide = "client" | "admin";

export interface SessionSubject {
    userId: string;
    username: string;
    role: string;
    services: string[];
    schemaName?: string;
    rememberMe?: boolean;
    userType?: SessionSide;
}

const REMEMBER_DAYS = () => Number(process.env.REFRESH_TTL_DAYS || 14);
const SESSION_DAYS = () => Number(process.env.REFRESH_TTL_DAYS_NO_REMEMBER || 1);

function refreshTtlSeconds(rememberMe: boolean): number {
    const days = rememberMe ? REMEMBER_DAYS() : SESSION_DAYS();
    return Math.max(1, days) * 86400;
}

function digest(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
}

function recordKey(userId: string, sid: string, side: SessionSide = "client"): string {
    return `rt:${side}:${userId}:${sid}`;
}

function indexKey(sid: string, side: SessionSide = "client"): string {
    return `rtid:${side}:${sid}`;
}

function signAccess(subject: SessionSubject, sid: string, secret: string, ttlSeconds: number): string {
    return jwt.sign({
        user_id: subject.userId,
        user_type: subject.userType || "client",
        schema_name: subject.schemaName || "public",
        sid,
        access_mode: "full",
        username: subject.username,
        sub: subject.username,
        role: subject.role,
        services: subject.services,
    }, secret, { expiresIn: ttlSeconds });
}

export async function issueClientSession(
    store: KeyValueStore,
    subject: SessionSubject,
    secret: string,
    accessTtlSeconds: number,
): Promise<IssuedSession> {
    const refreshToken = randomBytes(48).toString("base64url");
    const sid = digest(refreshToken).slice(0, 16);
    const side = subject.userType || "client";
    const persistent = subject.rememberMe === true;
    const record = {
        hash: digest(refreshToken),
        userId: subject.userId,
        username: subject.username,
        role: subject.role,
        services: subject.services,
        schemaName: subject.schemaName || "public",
        rememberMe: persistent,
        lastActivityAt: new Date().toISOString(),
    };
    const ttl = refreshTtlSeconds(persistent);
    await store.setRaw(recordKey(subject.userId, sid, side), JSON.stringify(record), ttl);
    await store.setRaw(indexKey(sid, side), recordKey(subject.userId, sid, side), ttl);
    return {
        accessToken: signAccess(subject, sid, secret, accessTtlSeconds),
        refreshToken,
        persistent,
        sid,
    };
}

/** Issues a new pair and drops the previous refresh. Does not touch lastActivityAt. */
export async function rotateClientSession(
    store: KeyValueStore,
    rawRefresh: string,
    secret: string,
    accessTtlSeconds: number,
    side: SessionSide = "client",
): Promise<IssuedSession | null> {
    if (!rawRefresh) return null;
    const sid = digest(rawRefresh).slice(0, 16);
    const pointer = await store.getRaw(indexKey(sid, side));
    if (!pointer) return null;
    const raw = await store.getRaw(pointer);
    if (!raw) return null;
    const current = JSON.parse(raw) as {
        hash: string;
        userId: string;
        username: string;
        role: string;
        services: string[];
        schemaName: string;
        rememberMe: boolean;
        lastActivityAt: string;
    };
    if (current.hash !== digest(rawRefresh)) return null;
    await store.deleteRaw(pointer);
    await store.deleteRaw(indexKey(sid, side));
    const next = await issueClientSession(store, {
        userId: current.userId,
        username: current.username,
        role: current.role,
        services: current.services,
        schemaName: current.schemaName,
        rememberMe: current.rememberMe,
        userType: side,
    }, secret, accessTtlSeconds);
    const nextRaw = await store.getRaw(recordKey(current.userId, next.sid, side));
    if (nextRaw) {
        const parsed = JSON.parse(nextRaw);
        parsed.lastActivityAt = current.lastActivityAt;
        const ttl = refreshTtlSeconds(current.rememberMe);
        await store.setRaw(recordKey(current.userId, next.sid, side), JSON.stringify(parsed), ttl);
    }
    return next;
}

export async function sessionAlive(store: KeyValueStore, userId: string, sid: string, side: SessionSide = "client"): Promise<boolean> {
    const raw = await store.getRaw(recordKey(userId, sid, side));
    return Boolean(raw);
}

export async function clientSessionAlive(store: KeyValueStore, userId: string, sid: string): Promise<boolean> {
    return sessionAlive(store, userId, sid, "client");
}

export async function revokeClientSession(store: KeyValueStore, userId: string, sid: string, side: SessionSide = "client"): Promise<void> {
    await store.deleteRaw(recordKey(userId, sid, side));
    await store.deleteRaw(indexKey(sid, side));
}
