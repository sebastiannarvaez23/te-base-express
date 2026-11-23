import express from "express";

import { pathParams, uuidParam } from "../../../../../../../core/http/path-params";
import { buildServiceListQueryParams } from "../../../../identity/profile/infrastructure/middlewares/service-query-params.middleware";
import { serviceController, serviceMiddleware, authMiddleware, authorizationMiddleware, queryParamsMiddleware, serviceSerialzerMiddleware } from "../../../../../../../app/composition/access";
import { ServiceListValidator } from "../../application/validations/service-qlist.validator";

const servicesRoutes = express.Router();

servicesRoutes.get("/",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0401'),
    queryParamsMiddleware.queryValidationMiddleware(new ServiceListValidator(), buildServiceListQueryParams),
    serviceController.getList.bind(serviceController));

servicesRoutes.get("/:id",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0402'),
    pathParams({ id: uuidParam }),
    serviceController.get.bind(serviceController));

servicesRoutes.post("/",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0403'),
    serviceMiddleware.validateAdd.bind(serviceMiddleware),
    serviceSerialzerMiddleware.add(),
    serviceController.add.bind(serviceController));

servicesRoutes.put("/:id",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0404'),
    pathParams({ id: uuidParam }),
    serviceMiddleware.validateEdit.bind(serviceMiddleware),
    serviceSerialzerMiddleware.edit(),
    serviceController.edit.bind(serviceController));

servicesRoutes.delete("/:id",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0405'),
    pathParams({ id: uuidParam }),
    serviceController.delete.bind(serviceController));

export default servicesRoutes;