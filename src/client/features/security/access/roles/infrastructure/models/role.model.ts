import { BelongsToMany, Column, CreatedAt, DataType, DeletedAt, Model, Table, UpdatedAt } from "sequelize-typescript";

import { uuidv7 } from "../../../../../../../core/ids";
import { ServiceModel } from "../../../services/infrastructure/models/service.model";
import { RoleServiceModel } from "./role-service.model";

@Table({
    timestamps: true,
    tableName: 'roles',
    paranoid: true,
    modelName: 'RoleModel',
})
export class RoleModel extends Model {
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        field: 'id',
        defaultValue: () => uuidv7(),
    })
    declare id: string;

    @Column({
        type: DataType.STRING(100),
        field: 'name',
        allowNull: false,
        unique: true,
    })
    declare name: string;

    @Column({
        type: DataType.UUID,
        field: 'created_by',
        allowNull: false,
    })
    declare createdBy: string;

    @Column({
        type: DataType.UUID,
        field: 'updated_by',
        allowNull: true,
    })
    declare updatedBy: string;

    @CreatedAt
    @Column({
        type: DataType.DATE,
        field: 'created_at',
    })
    declare createdAt: Date;

    @UpdatedAt
    @Column({
        type: DataType.DATE,
        field: 'updated_at',
    })
    declare updatedAt: Date;

    @DeletedAt
    @Column({
        type: DataType.DATE,
        field: 'deleted_at',
    })
    declare deletedAt: Date;

    @BelongsToMany(() => ServiceModel, {
        through: () => RoleServiceModel,
        foreignKey: "roleId",
        otherKey: "serviceId",
        onDelete: "NO ACTION",
        onUpdate: "NO ACTION",
    })
    services!: ServiceModel[];
}