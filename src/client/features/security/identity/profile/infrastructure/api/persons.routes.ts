import express from "express";

import { emailParam, nicknameParam, pathParams, uuidParam } from "../../../../../../../core/http/path-params";
import { buildPersonListQueryParams } from "../middlewares/person-query-params.middleware";
import { personController, authMiddleware, authorizationMiddleware, personMiddleware, queryParamsMiddleware, personSerialzerMiddleware } from "../../../../../../../app/composition/identity";
import { PersonListValidator } from "../../application/validations/person-qlist.validator";

const personsRoutes = express.Router();

personsRoutes.get("/",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0201'),
    queryParamsMiddleware.queryValidationMiddleware(new PersonListValidator(), buildPersonListQueryParams),
    personController.getList.bind(personController));

personsRoutes.get("/by-nickname/:nickname",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0206'),
    pathParams({ nickname: nicknameParam }),
    personController.getPersonByNickname.bind(personController));

personsRoutes.get("/by-email/:email",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0207'),
    pathParams({ email: emailParam }),
    personController.getPersonByEmail.bind(personController));

personsRoutes.get("/:id",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0202'),
    pathParams({ id: uuidParam }),
    personController.get.bind(personController));

personsRoutes.post("/",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0203'),
    personMiddleware.validateAdd.bind(personMiddleware),
    personSerialzerMiddleware.add(),
    personController.add.bind(personController));

personsRoutes.put("/:id",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0204'),
    pathParams({ id: uuidParam }),
    personMiddleware.validateEdit.bind(personMiddleware),
    personSerialzerMiddleware.edit(),
    personController.edit.bind(personController));

personsRoutes.delete("/:id",
    authMiddleware.authenticateToken,
    authorizationMiddleware.checkAccess('0205'),
    pathParams({ id: uuidParam }),
    personController.delete.bind(personController));

export default personsRoutes;