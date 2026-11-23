import { config } from "dotenv";

import { AuthEntity } from "../../domain/auth.entity";
import { EncryptionUtil } from "../../../../../../../core/utils/encryption.util";
import { generateResetToken } from "../../../../../../../core/utils/token-generator.util";
import { hashPassword, passwordMatches } from "../../../../../../../core/passwords";
import { HttpError } from "../../../../../../../core/utils/error.util";
import { OAuthClientEntity } from "../../domain/oauth-client.entity";
import { IOAuthClientRepository } from "../../domain/repositories/o-auth-client.repository";
import { PersonsRepository } from "../../../../identity/profile/domain/repositories/persons.repository";
import { RedisConfig } from "../../../../../../../config/redis";
import { resetSubject } from "../../domain/reset-subject";
import { RolesRepository } from "../../../../access/roles/domain/repositories/roles.repository";
import { sendPasswordResetEmail } from "../../../../../../../core/utils/mailer.util";
import { issueClientSession, revokeClientSession, rotateClientSession } from "../../../../../../../core/http/client-session";
import { accessTokenTtlSeconds } from "../../../../../../../core/utils/token-manager.util";
import { tokenManager, oAuth2TokenManager } from '../../dependencies';
import { UserManagement } from "../../../../lifecycle/registration/application/use-cases/user-management";

config();

interface AuthDeps {
    secret: string;
    ttl: number;
    encryption: EncryptionUtil;
    redis: RedisConfig;
    users: UserManagement;
    persons: PersonsRepository;
    roles: RolesRepository;
    oauth: IOAuthClientRepository;
}

export class AuthenticateUserUseCase {
    constructor(private readonly deps: AuthDeps) { }

    async execute(credentials: AuthEntity) {
        const validateCredentials = await this.deps.users.validateCredential(credentials);
        if (!validateCredentials) throw new HttpError("AUTH_001");

        const person = await this.deps.persons.getPersonByNickname(credentials.nickname);
        if (!person?.user?.id || !person.user.nickname) throw new HttpError("USER_001");

        const role = person.roleId ? await this.deps.roles.get(person.roleId) : null;
        if (!role?.name) throw new HttpError("ROLE_001");
        const services = (role.services || []).map((service) => service.code).filter((code): code is string => Boolean(code));

        return issueClientSession(this.deps.redis, {
            userId: person.user.id,
            username: person.user.nickname,
            role: role.name,
            services,
            schemaName: "public",
            rememberMe: credentials.remember_me,
        }, this.deps.secret, this.deps.ttl);
    }
}

export class RefreshUserSessionUseCase {
    constructor(private readonly deps: AuthDeps) { }

    async execute(rawRefresh: string | undefined) {
        if (!rawRefresh) throw new HttpError("SESS_001");
        const next = await rotateClientSession(this.deps.redis, rawRefresh, this.deps.secret, this.deps.ttl);
        if (!next) throw new HttpError("SESS_001");
        return next;
    }
}

export class LogoutUserUseCase {
    constructor(private readonly deps: AuthDeps) { }

    async execute(authHeader: string | undefined, nickname: string, sid?: { userId: string; sid: string }): Promise<boolean> {
        if (!authHeader && !sid) throw new HttpError("AUTH_005");
        if (authHeader && !authHeader.split(' ')[1] && !sid) throw new HttpError("AUTH_005");
        if (sid) await revokeClientSession(this.deps.redis, sid.userId, sid.sid);
        if (nickname) await tokenManager.revokeToken(nickname);
        return true;
    }
}

export class RequestPasswordResetUseCase {
    constructor(private readonly deps: AuthDeps) { }

    async execute(email: string): Promise<{ message: string | null }> {
        const person = await this.deps.persons.getPersonByEmail(email);
        const nickname = resetSubject(person);
        if (!person?.email || !nickname) throw new HttpError("USER_001");
        const resetToken = generateResetToken();
        await this.deps.redis.storeResetPassToken(resetToken, nickname);
        await sendPasswordResetEmail(person.email, resetToken);
        return { message: "Mail has been sent correctly. Review your inbox." };
    }
}

export class ResetPasswordUseCase {
    constructor(private readonly deps: AuthDeps) { }

    async execute(token: string, newPassword: string): Promise<{ message: string }> {
        const nickname = await this.deps.redis.getResetPassTokenFromRedis(token);
        if (!nickname) throw new HttpError("AUTH_021");

        const person = await this.deps.persons.getPersonByNickname(nickname);
        if (!person?.user?.id) throw new HttpError("USER_001");

        const passwordHash = await hashPassword(newPassword);
        await this.deps.users.replacePassword(person.user.id, passwordHash, person.user.id);
        await this.deps.redis.deleteResetPassToken(token);
        return { message: "The password has been reset successfully." };
    }
}

export class IssueOAuthTokenUseCase {
    constructor(private readonly deps: AuthDeps) { }

    async execute(clientId: string, clientSecret: string): Promise<string> {
        const client = await this.deps.oauth.findByClientName(clientId);
        if (!client?.name) throw new HttpError("AUTH_008");
        const matches = await passwordMatches(clientSecret, client.secret || "", this.deps.encryption);
        if (!matches) throw new HttpError("AUTH_008");
        return oAuth2TokenManager.generateToken({ sub: client.name }, this.deps.secret, this.deps.ttl);
    }
}

export class RegisterMicroserviceUseCase {
    constructor(private readonly deps: AuthDeps) { }

    async execute(credential: { client_id: string, client_secret: string }): Promise<OAuthClientEntity | null> {
        const secret = await hashPassword(credential.client_secret);
        return this.deps.oauth.addMicroservice({ name: credential.client_id, secret });
    }
}

/** Groups the auth use cases for the HTTP adapter. Each use case has one execute. */
export class AuthManagement {

    private readonly deps: AuthDeps;

    constructor(
        encryption: EncryptionUtil,
        redis: RedisConfig,
        oauth: IOAuthClientRepository,
        users: UserManagement,
        persons: PersonsRepository,
        roles: RolesRepository,
    ) {
        this.deps = {
            secret: process.env.SECRET_KEY!,
            ttl: accessTokenTtlSeconds(Number(process.env.SESION_SG_EXP)),
            encryption,
            redis,
            users,
            persons,
            roles,
            oauth,
        };
    }

    authentication(credentials: AuthEntity) {
        return new AuthenticateUserUseCase(this.deps).execute(credentials);
    }

    refresh(rawRefresh: string | undefined) {
        return new RefreshUserSessionUseCase(this.deps).execute(rawRefresh);
    }

    logout(authHeader: string | undefined, nickname: string, sid?: { userId: string; sid: string }) {
        return new LogoutUserUseCase(this.deps).execute(authHeader, nickname, sid);
    }

    requestPasswordReset(email: string) {
        return new RequestPasswordResetUseCase(this.deps).execute(email);
    }

    passwordReset(token: string, newPassword: string) {
        return new ResetPasswordUseCase(this.deps).execute(token, newPassword);
    }

    generateOAuth2Token(clientId: string, clientSecret: string) {
        return new IssueOAuthTokenUseCase(this.deps).execute(clientId, clientSecret);
    }

    addMicroservice(credential: { client_id: string, client_secret: string }) {
        return new RegisterMicroserviceUseCase(this.deps).execute(credential);
    }
}
