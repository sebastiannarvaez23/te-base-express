import { Column, CreatedAt, DataType, Model, Table } from "sequelize-typescript";

import { uuidv7 } from "../../../../../../../core/ids";

@Table({
    tableName: "audit_events",
    timestamps: true,
    updatedAt: false,
    modelName: "AuditEventModel",
})
export class AuditEventModel extends Model {
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: () => uuidv7(),
    })
    declare id: string;

    @Column({
        type: DataType.STRING(80),
        allowNull: false,
    })
    declare entity: string;

    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: "entity_id",
    })
    declare entityId: string;

    @Column({
        type: DataType.STRING(40),
        allowNull: false,
    })
    declare action: string;

    @Column({
        type: DataType.UUID,
        allowNull: true,
        field: "actor_id",
    })
    declare actorId: string | null;

    @CreatedAt
    @Column({
        type: DataType.DATE,
        field: "created_at",
    })
    declare createdAt: Date;
}
