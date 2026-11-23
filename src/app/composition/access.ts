import { AuthMiddleware } from "../../core/middlewares/auth/authenticate.middleware";
import { AuthorizationMiddleware } from "../../core/middlewares/auth/authorization.middleware";
import { AuthValidator } from "../../core/middlewares/validators/auth.validator";
import { ErrorHandlerUtil } from "../../core/utils/error-handler.util";
import { QueryParamsMiddleware } from "../../core/middlewares/validators/validation-query-params.middleware";
import { RedisConfig } from "../../config/redis";
import { RoleManagement } from "../../client/features/security/access/roles/application/use-cases/role-management";
import { RoleMiddleware } from "../../client/features/security/access/roles/infrastructure/middlewares/role.middleware";
import { RolesController } from "../../client/features/security/access/roles/infrastructure/api/roles.controller";
import { RoleSerializerMiddleware } from "../../client/features/security/access/roles/infrastructure/middlewares/rol-serializer.middleware";
import { RolesRepositoryImpl } from "../../client/features/security/access/roles/infrastructure/repositories/role.repository-impl";
import { ServiceManagement } from "../../client/features/security/access/services/application/use-cases/service-management";
import { ServiceMiddleware } from "../../client/features/security/access/services/infrastructure/middlewares/service.middleware";
import { ServicesController } from "../../client/features/security/access/services/infrastructure/api/service.controller";
import { ServiceSerialzerMiddleware } from "../../client/features/security/access/services/infrastructure/middlewares/service-serializer.middleware";
import { ServicesRepositoryImpl } from "../../client/features/security/access/services/infrastructure/repositories/service.repository-impl";
import { TokenManager } from "../../core/utils/token-manager.util";


const handlerError: ErrorHandlerUtil = new ErrorHandlerUtil();
const authValidator: AuthValidator = new AuthValidator();
const redisConfig: RedisConfig = new RedisConfig();

// abstract

const rolesRepository = new RolesRepositoryImpl();
const servicesRepository = new ServicesRepositoryImpl();

const roleManagement = new RoleManagement(rolesRepository);
const serviceManagement = new ServiceManagement(servicesRepository);

// dependencies

export const tokenManager = TokenManager.getInstance(redisConfig);
export const roleSerialzerMiddleware = new RoleSerializerMiddleware();
export const serviceSerialzerMiddleware = new ServiceSerialzerMiddleware();
export const queryParamsMiddleware = new QueryParamsMiddleware();
export const authorizationMiddleware = new AuthorizationMiddleware();
export const authMiddleware = new AuthMiddleware(authValidator, tokenManager);
export const serviceMiddleware = new ServiceMiddleware();
export const serviceController = new ServicesController(serviceManagement, handlerError);
export const roleMiddleware: RoleMiddleware = new RoleMiddleware();
export const roleController: RolesController = new RolesController(roleManagement, handlerError);