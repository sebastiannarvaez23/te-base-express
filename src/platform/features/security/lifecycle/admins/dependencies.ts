import { RedisConfig } from "../../../../../config/redis";
import { accessTokenTtlSeconds } from "../../../../../core/utils/token-manager.util";
import { EncryptionUtil } from "../../../../../core/utils/encryption.util";
import { ErrorHandlerUtil } from "../../../../../core/utils/error-handler.util";
import { AuthenticateAdminUseCase, LogoutAdminUseCase, RefreshAdminSessionUseCase } from "./application/authenticate-admin.use-case";
import { AdminsRepositoryImpl } from "./infrastructure/repositories/admins.repository-impl";
import { AdminAuthController } from "./presentation/admin-auth.controller";

const redis = new RedisConfig();
const secret = process.env.SECRET_KEY || "";
const ttl = accessTokenTtlSeconds(Number(process.env.SESION_SG_EXP));
const encryption = new EncryptionUtil();

export const adminAuthController = new AdminAuthController(
    new AuthenticateAdminUseCase(new AdminsRepositoryImpl(), redis, secret, ttl, encryption),
    new RefreshAdminSessionUseCase(redis, secret, ttl),
    new LogoutAdminUseCase(redis),
    new ErrorHandlerUtil(),
);
