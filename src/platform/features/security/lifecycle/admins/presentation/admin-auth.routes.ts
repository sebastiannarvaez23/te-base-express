import express from "express";

import { adminLoginSchema } from "../../../../../../core/contracts/input-schemas";
import { validateBody } from "../../../../../../core/middlewares/validators/validation.middleware";
import { adminAuthController } from "../dependencies";

const adminAuthRoutes = express.Router();

adminAuthRoutes.post("/token",
    validateBody(adminLoginSchema),
    adminAuthController.token.bind(adminAuthController));

adminAuthRoutes.post("/refresh",
    adminAuthController.refresh.bind(adminAuthController));

adminAuthRoutes.post("/logout",
    adminAuthController.logout.bind(adminAuthController));

export default adminAuthRoutes;
