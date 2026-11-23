import express from "express";

import { pathParams, uuidParam } from "../../../../../../../core/http/path-params";
import { authMiddleware, authorizationMiddleware, userController, userMiddleware } from "../../../../../../../app/composition/identity";

const usersRoutes = express.Router();

usersRoutes.post("/",
    userMiddleware.validateAdd.bind(userMiddleware),
    userController.add.bind(userController));

usersRoutes.put("/:id",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0204'),
    pathParams({ id: uuidParam }),
    userMiddleware.validateEdit.bind(userMiddleware),
    userController.edit.bind(userController));

usersRoutes.post("/validate-credentials",
    userMiddleware.validateCredentialBody.bind(userMiddleware),
    userController.validateCredential.bind(userController));

export default usersRoutes;