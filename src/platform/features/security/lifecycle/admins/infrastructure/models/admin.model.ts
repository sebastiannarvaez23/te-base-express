import { Column, DataType, Model, Table } from "sequelize-typescript";

import { uuidv7 } from "../../../../../../../core/ids";

@Table({
    tableName: "platform_admins",
    timestamps: true,
    underscored: true,
    modelName: "AdminModel",
})
export class AdminModel extends Model {
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: () => uuidv7(),
    })
    declare id: string;

    @Column({
        type: DataType.STRING(50),
        allowNull: false,
        unique: true,
    })
    declare username: string;

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
    })
    declare password: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare active: boolean;
}
