import express from "express";

import { oauthClientSchema, passwordResetRequestSchema, passwordResetSchema } from "../../../../../../../core/contracts/input-schemas";
import { resetTokenParam, pathParams } from "../../../../../../../core/http/path-params";
import { validateBody } from "../../../../../../../core/middlewares/validators/validation.middleware";
import { authController } from "../../dependencies";

const authRoutes = express.Router();

authRoutes.post("/token",
    authController.authentication.bind(authController));

authRoutes.post("/refresh",
    authController.refresh.bind(authController));

authRoutes.post('/logout',
    authController.logout.bind(authController));

authRoutes.post('/request-password-reset',
    validateBody(passwordResetRequestSchema),
    authController.requestPasswordReset.bind(authController));

authRoutes.post('/reset-password/:token',
    pathParams({ token: resetTokenParam }),
    validateBody(passwordResetSchema),
    authController.passwordReset.bind(authController));

authRoutes.post("/token-oauth",
    validateBody(oauthClientSchema),
    authController.generateOAuth2Token.bind(authController));

authRoutes.post("/register-microservice",
    validateBody(oauthClientSchema),
    authController.registerMicroservice.bind(authController));

export default authRoutes;