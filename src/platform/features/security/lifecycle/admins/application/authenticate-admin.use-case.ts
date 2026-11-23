import { EncryptionUtil } from "../../../../../../core/utils/encryption.util";
import { HttpError } from "../../../../../../core/utils/error.util";
import { issueClientSession, IssuedSession, KeyValueStore, revokeClientSession, rotateClientSession } from "../../../../../../core/http/client-session";
import { passwordMatches } from "../../../../../../core/passwords";
import { AdminsRepository } from "../domain/repositories/admins.repository";

export interface AdminLogin {
    username: string;
    password: string;
    remember_me?: boolean;
}

export class AuthenticateAdminUseCase {
    constructor(
        private readonly admins: AdminsRepository,
        private readonly store: KeyValueStore,
        private readonly secret: string,
        private readonly ttlSeconds: number,
        private readonly encryption: EncryptionUtil,
    ) { }

    async execute(input: AdminLogin): Promise<IssuedSession> {
        const admin = await this.admins.findByUsername(input.username);
        if (!admin?.id || !admin.password) throw new HttpError("AUTH_001");
        if (admin.active === false) throw new HttpError("AUTH_003");
        const matches = await passwordMatches(input.password, admin.password, this.encryption);
        if (!matches) throw new HttpError("AUTH_001");
        return issueClientSession(this.store, {
            userId: admin.id,
            username: admin.username || input.username,
            role: "platform",
            services: [],
            schemaName: "public",
            rememberMe: input.remember_me,
            userType: "admin",
        }, this.secret, this.ttlSeconds);
    }
}

export class RefreshAdminSessionUseCase {
    constructor(
        private readonly store: KeyValueStore,
        private readonly secret: string,
        private readonly ttlSeconds: number,
    ) { }

    async execute(rawRefresh: string | undefined): Promise<IssuedSession> {
        if (!rawRefresh) throw new HttpError("SESS_001");
        const next = await rotateClientSession(this.store, rawRefresh, this.secret, this.ttlSeconds, "admin");
        if (!next) throw new HttpError("SESS_001");
        return next;
    }
}

export class LogoutAdminUseCase {
    constructor(private readonly store: KeyValueStore) { }

    async execute(session?: { userId: string; sid: string }): Promise<boolean> {
        if (session) await revokeClientSession(this.store, session.userId, session.sid, "admin");
        return true;
    }
}
