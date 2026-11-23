import { RoleEntity } from "../../../access/roles/domain/role.entity";
import { UserEntity } from "../../../lifecycle/registration/domain/user.entity";

export interface PersonEntity {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    birthDate?: Date;
    roleId?: string;
    userId?: string;
    createdBy?: string;
    updatedBy?: string;
    role?: RoleEntity;
    user?: UserEntity;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}