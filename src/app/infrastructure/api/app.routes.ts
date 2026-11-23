import cors from "cors";
import express, { Application, Request, Response, NextFunction } from "express";

import { resolveAuthContext } from "../../../core/http/auth-context";
import { apiPrefix } from "../../../core/http/api-prefix";
import { openApiDocument, redocHtml, swaggerHtml } from "../../../core/http/openapi";
import { uuidv7 } from "../../../core/ids";

import { RouteGroup } from "../../route-group.entity";
import apiGatewayRoutes from "./api-gateway.routes";
import authRoutes from "../../../client/features/security/lifecycle/auth/infrastructure/api/auth.routes";
import personsRoutes from "../../../client/features/security/identity/profile/infrastructure/api/persons.routes";
import rolesRoutes from "../../../client/features/security/access/roles/infrastructure/api/roles.routes";
import servicesRoutes from "../../../client/features/security/access/services/infrastructure/api/service.routes";
import usersRoutes from "../../../client/features/security/lifecycle/registration/infrastructure/api/users.routes";
import adminAuthRoutes from "../../../platform/features/security/lifecycle/admins/presentation/admin-auth.routes";

export class AppRoutes {

  private base: string = apiPrefix();

  private routeGroup: RouteGroup[] = [
    {
      path: '/api',
      router: apiGatewayRoutes
    },
    {
      path: `${this.base}/auth`,
      router: authRoutes
    },
    {
      path: `${this.base}/user`,
      router: usersRoutes
    },
    {
      path: `${this.base}/person`,
      router: personsRoutes
    },
    {
      path: `${this.base}/role`,
      router: rolesRoutes
    },
    {
      path: `${this.base}/service`,
      router: servicesRoutes
    },
    {
      path: `${this.base}/platform/auth`,
      router: adminAuthRoutes
    },
  ];

  constructor(private readonly _app: Application) { }

  public init() {
    this.middlewares();
    this.routeGroup.forEach(route => {
      this._app.use(route.path, route.router);
    });
    this.errorHandlingMiddleware();
  }

  private middlewares() {
    this._app.use(cors());
    this._app.use(express.json());
    this._app.use(express.static("public"));

    this._app.use((req: Request, res: Response, next: NextFunction) => {
      const started = Date.now();
      const requestId = req.header("x-request-id") || uuidv7();
      res.setHeader("X-Request-ID", requestId);
      res.on("finish", () => {
        try {
          console.info(JSON.stringify({
            requestId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            ms: Date.now() - started,
          }));
        } catch {
          // A log failure must not change the response.
        }
      });
      const authContext = resolveAuthContext(req);
      if (authContext) res.setHeader("X-Auth-Context", authContext);
      next();
    });

    this._app.get(`${this.base}/schema/`, (_req, res) => {
      res.json(openApiDocument());
    });
    this._app.get(`${this.base}/docs/`, (_req, res) => {
      res.type("html").send(swaggerHtml());
    });
    this._app.get(`${this.base}/redoc/`, (_req, res) => {
      res.type("html").send(redocHtml());
    });

    this._app.use((_req: Request, res: Response, next: NextFunction) => {
      const originalJson = res.json.bind(res);
      const resolvedAt = () => new Date().toISOString().replace("T", " ").slice(0, 19);

      res.json = (body?: any): Response => {
        if (body?.errors) {
          return originalJson({
            status_code: res.statusCode,
            message: "Error",
            resolved_at: resolvedAt(),
            errors: Array.isArray(body.errors) ? body.errors : [body.errors],
          });
        }
        return originalJson({
          status_code: res.statusCode || 200,
          message: "OK",
          resolved_at: resolvedAt(),
          data: body?.data !== undefined ? body.data : (body ?? null),
        });
      };
      next();
    });
  }

  private errorHandlingMiddleware() {
    this._app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const statusCode = err.statusCode || 500;
      const detail = err.message || "An unexpected error occurred";
      const code = String(err.internalCode || "SRV_001");
      res.status(statusCode).json({
        errors: [{ field: "", code, detail }],
      });
    });
  }
}
