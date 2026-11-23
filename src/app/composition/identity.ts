import { AuthMiddleware } from "../../core/middlewares/auth/authenticate.middleware";
import { AuthorizationMiddleware } from "../../core/middlewares/auth/authorization.middleware";
import { AuthValidator } from "../../core/middlewares/validators/auth.validator";
import { EncryptionUtil } from "../../core/utils/encryption.util";
import { ErrorHandlerUtil } from "../../core/utils/error-handler.util";
import { PersonManagement } from "../../client/features/security/identity/profile/application/use-cases/person-management";
import { PersonMiddleware } from "../../client/features/security/identity/profile/infrastructure/middlewares/person.middleware";
import { PersonsController } from "../../client/features/security/identity/profile/infrastructure/api/persons.controller";
import { PersonSerialzerMiddleware } from "../../client/features/security/identity/profile/infrastructure/middlewares/person-serializer.middleware";
import { PersonsRepositoryImpl } from "../../client/features/security/identity/profile/infrastructure/repositories/persons.repository-impl";
import { QueryParamsMiddleware } from "../../core/middlewares/validators/validation-query-params.middleware";
import { RedisConfig } from "../../config/redis";
import { TokenManager } from "../../core/utils/token-manager.util";
import { UserManagement } from "../../client/features/security/lifecycle/registration/application/use-cases/user-management";
import { UserMiddleware } from "../../client/features/security/lifecycle/registration/infrastructure/middlewares/user.middleware";
import { UsersController } from "../../client/features/security/lifecycle/registration/infrastructure/api/users.controller";
import { UsersRepositoryImpl } from "../../client/features/security/lifecycle/registration/infrastructure/repositories/users.repository-impl";


const encryptionService: EncryptionUtil = new EncryptionUtil();
const handlerError: ErrorHandlerUtil = new ErrorHandlerUtil();
const authValidator: AuthValidator = new AuthValidator();
const redisConfig: RedisConfig = new RedisConfig();

// abstract

const personsRepository = new PersonsRepositoryImpl();
const usersRepository = new UsersRepositoryImpl();

const personManagement = new PersonManagement(personsRepository);
const userManagement = new UserManagement(usersRepository, encryptionService);

// dependencies
export const tokenManager = TokenManager.getInstance(redisConfig);
export const authorizationMiddleware = new AuthorizationMiddleware();
export const authMiddleware = new AuthMiddleware(authValidator, tokenManager);
export const queryParamsMiddleware = new QueryParamsMiddleware();
export const personMiddleware = new PersonMiddleware();
export const personSerialzerMiddleware = new PersonSerialzerMiddleware();
export const userMiddleware = new UserMiddleware();
export const personController = new PersonsController(personManagement, handlerError);
export const userController = new UsersController(userManagement, handlerError);