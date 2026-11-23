import { Optional, UniqueConstraintError } from "sequelize";

import { logError } from "../../../../../../../core/redaction";
import { withStateChange } from "../../../../../../../core/state-change";
import { HttpError } from "../../../../../../../core/utils/error.util";
import { QueryParams } from "../../../../../../../core/contracts/query-params.entity";
import { RoleEntity } from "../../domain/role.entity";
import { RoleModel } from "../models/role.model";
import { RolesRepository } from "../../domain/repositories/roles.repository";
import { ServiceModel } from "../../../services/infrastructure/models/service.model";

export class RolesRepositoryImpl implements RolesRepository {

    async getList(queryParams: QueryParams): Promise<{ rows: RoleModel[]; count: number; }> {
        try {
            return await RoleModel.findAndCountAll({
                where: queryParams.filters,
                order: [["createdAt", "desc"]],
                limit: queryParams.limit,
                offset: queryParams.offset,
                attributes: {
                    exclude: ['updatedAt', 'deletedAt']
                },
            });
        } catch (e) {
            logError("Role query failed", e);
            throw e;
        }
    }

    async get(id: string): Promise<RoleModel | null> {
        try {
            const role = await RoleModel.findOne(
                {
                    where: { id },
                    attributes: {
                        exclude: ['updatedAt', 'deletedAt']
                    },
                    include: [
                        {
                            model: ServiceModel,
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                            through: {
                                attributes: []
                            }
                        }
                    ]
                });
            if (!role) {
                throw new HttpError("ROLE_001");
            }
            return role;
        } catch (error) {
            throw error;
        }
    }

    async add(role: RoleEntity): Promise<RoleModel> {
        try {
            return await RoleModel.create(
                role as Optional<any, string>);
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw error;
            }
            throw new HttpError("SRV_001");
        }
    }

    async edit(id: string, role: RoleEntity): Promise<RoleModel> {
        try {
            const [affectRows, editedPerson] = await RoleModel.update(
                role as Optional<any, string>, {
                where: {
                    id: id,
                },
                returning: true
            });
            if (!editedPerson[0]) throw new HttpError("ROLE_001")
            return editedPerson[0];
        } catch (error) {
            throw error;
        }
    }

    async delete(id: string): Promise<RoleModel> {
        try {
            const roleToDelete = await RoleModel.findOne({
                where: { id: id }
            });
            if (!roleToDelete) {
                throw new HttpError("ROLE_001");
            }
            await roleToDelete.destroy();
            return roleToDelete;
        } catch (error) {
            throw error;
        }
    }

    async addServiceAssignment(roleId: string, services: string[]): Promise<RoleModel> {
        try {

            let role = await RoleModel.findOne({
                where: { id: roleId }
            });

            const serviceInstances = await ServiceModel.findAll({
                where: { id: services }
            });

            if (!role) throw new HttpError("ROLE_001");
            if (serviceInstances.length !== services.length) throw new HttpError("SVC_001");
            const current = role;

            await withStateChange(RoleModel.sequelize, async (transaction) => {
                await current.$add('services', serviceInstances, { transaction });
            }, { entity: "Role", entityId: roleId, action: "GRANT_SERVICES" });

            role = await RoleModel.findOne({
                where: { id: roleId },
                include: [ServiceModel],
            });
            if (!role) throw new HttpError("ROLE_001");

            return role;

        } catch (error) {
            throw error;
        }
    }

    async deleteServiceAssignment(roleId: string, services: string[]): Promise<RoleModel> {
        try {

            let role = await RoleModel.findOne({
                where: { id: roleId }
            });

            const serviceInstances = await ServiceModel.findAll({
                where: { id: services }
            });

            if (!role) throw new HttpError("ROLE_001");
            if (serviceInstances.length !== services.length) throw new HttpError("SVC_001");
            const current = role;

            await withStateChange(RoleModel.sequelize, async (transaction) => {
                await current.$remove('services', serviceInstances, { transaction });
            }, { entity: "Role", entityId: roleId, action: "REVOKE_SERVICES" });

            role = await RoleModel.findOne({
                where: { id: roleId },
                include: [ServiceModel],
            });
            if (!role) throw new HttpError("ROLE_001");

            return role;

        } catch (error) {
            throw error;
        }
    }
}