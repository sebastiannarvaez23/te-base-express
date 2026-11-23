import { config } from "dotenv";

import { logError } from "../core/redaction";
import { Dialect } from "sequelize";
import { Sequelize, SequelizeOptions } from "sequelize-typescript";

import { AuditEventModel } from "../client/features/logging/system/audit/infrastructure/models/audit-event.model";
import { AdminModel } from "../platform/features/security/lifecycle/admins/infrastructure/models/admin.model";
import { OAuthClientModel } from "../client/features/security/lifecycle/auth/infrastructure/models/o-auth-client.model";
import { PersonModel } from "../client/features/security/identity/profile/infrastructure/models/person.model";
import { RoleModel } from "../client/features/security/access/roles/infrastructure/models/role.model";
import { RoleServiceModel } from "../client/features/security/access/roles/infrastructure/models/role-service.model";
import { ServiceModel } from "../client/features/security/access/services/infrastructure/models/service.model";
import { UserModel } from '../client/features/security/lifecycle/registration/infrastructure/models/user.model';

config();

export class DatabaseConfig {

    private sequelize: Sequelize;
    public redisClient: any;

    constructor() {
        const name: string = process.env.DB_NAME!;
        const user: string = process.env.DB_USER!;
        const password: string = process.env.DB_PASSWORD!;
        const host: string = process.env.DB_HOST!;
        const port: number = Number(process.env.DB_PORT!);
        const driver: Dialect = process.env.DB_DRIVER as Dialect;

        const databaseOptions: SequelizeOptions = {
            host: host,
            port: port,
            dialect: driver,
            models: [
                OAuthClientModel,
                UserModel,
                PersonModel,
                RoleModel,
                ServiceModel,
                RoleServiceModel,
                AuditEventModel,
                AdminModel,
            ],
        };
        this.sequelize = new Sequelize(name, user, password, databaseOptions);
    }

    public getDatabase() {
        return this.sequelize;
    }

    public async syncDatabase() {
        try {
            await this.sequelize.sync({ alter: true });
            console.log('Synchronized database and tables');
        } catch (err) {
            logError("Database sync failed", err);
        }
    }
}
