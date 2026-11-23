import { AuthController } from "./infrastructure/api/auth.controller";
import { AuthManagement } from "./application/use-cases/auth-management";
import { AuthMiddleware } from "../../../../../core/middlewares/auth/authenticate.middleware";
import { AuthorizationMiddleware } from "../../../../../core/middlewares/auth/authorization.middleware";
import { AuthValidator } from "../../../../../core/middlewares/validators/auth.validator";
import { EncryptionUtil } from "../../../../../core/utils/encryption.util";
import { ErrorHandlerUtil } from "../../../../../core/utils/error-handler.util";
import { OAuth2TokenManager } from "../../../../../core/utils/o-auth2-token-manager.util";
import { OAuthClientRepository } from './infrastructure/repositories/o-auth-client-impl.repository';
import { PersonsRepositoryImpl } from "../../identity/profile/infrastructure/repositories/persons.repository-impl";
import { RedisConfig } from "../../../../../config/redis";
import { RolesRepositoryImpl } from "../../access/roles/infrastructure/repositories/role.repository-impl";
import { TokenManager } from "../../../../../core/utils/token-manager.util";
import { UserManagement } from "../registration/application/use-cases/user-management";
import { UsersRepositoryImpl } from "../registration/infrastructure/repositories/users.repository-impl";

const authValidator: AuthValidator = new AuthValidator();
const handlerError: ErrorHandlerUtil = new ErrorHandlerUtil();
const redisConfig: RedisConfig = new RedisConfig();
const encryptedService: EncryptionUtil = new EncryptionUtil();
const oAuthClientRepository: OAuthClientRepository = new OAuthClientRepository();
const userManagement = new UserManagement(new UsersRepositoryImpl(), encryptedService);

const authManagement = new AuthManagement(
    encryptedService,
    redisConfig,
    oAuthClientRepository,
    userManagement,
    new PersonsRepositoryImpl(),
    new RolesRepositoryImpl(),
);

// dependencies

export const tokenManager = TokenManager.getInstance(redisConfig);
export const oAuth2TokenManager = OAuth2TokenManager.getInstance(redisConfig);
export const authorizationMiddleware = new AuthorizationMiddleware();
export const authMiddleware = new AuthMiddleware(authValidator, tokenManager, redisConfig);
export const authController = new AuthController(authManagement, authMiddleware, handlerError);