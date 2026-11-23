import { ServiceEntity } from "../../services/domain/service.entity";

export interface RoleEntity {
    id?: string;
    name?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    services?: ServiceEntity[];
}