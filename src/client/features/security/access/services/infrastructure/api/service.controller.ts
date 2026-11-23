import { Request, Response } from "express";

import { ErrorHandlerUtil } from "../../../../../../../core/utils/error-handler.util";
import { HttpError } from "../../../../../../../core/utils/error.util";
import { ServiceManagement } from "../../application/use-cases/service-management";
import { QueryParams } from "../../../../../../../core/contracts/query-params.entity";
import { toPage } from "../../../../../../../core/pagination";

export class ServicesController {

    private readonly _LIST_PAGINATION_LIMIT: number;

    constructor(
        private readonly _serviceManagement: ServiceManagement,
        private readonly _handlerError: ErrorHandlerUtil
    ) {
        this._LIST_PAGINATION_LIMIT = Number(process.env.LIST_PAGINATION_LIMIT!);
    }

    async getList(req: Request, res: Response) {
        try {
            const queryParams: QueryParams = (req as any).queryParams;
            res.status(200).json(toPage(await this._serviceManagement.getList(queryParams), queryParams));
        } catch (error) {
            this._handlerError.handle(error as HttpError | Error, req, res);
        }
    }

    async get(req: Request, res: Response) {
        const { id } = req.params;
        try {
            res.status(200).json(await this._serviceManagement.get(id));
        } catch (error) {
            this._handlerError.handle(error as HttpError | Error, req, res);
        }
    }

    async add(req: Request, res: Response) {
        try {
            const result = await this._serviceManagement.add(req.body);
            res.status(200).json(result);
        } catch (error) {
            this._handlerError.handle(error as HttpError | Error, req, res);
        }
    }

    async edit(req: Request, res: Response) {
        const { id } = req.params;
        try {
            res.status(200).json(await this._serviceManagement.edit(id, req.body));
        } catch (error) {
            this._handlerError.handle(error as HttpError | Error, req, res);
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            res.status(200).json(await this._serviceManagement.delete(id));
        } catch (error) {
            this._handlerError.handle(error as HttpError | Error, req, res);
        }
    };
}
