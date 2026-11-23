import { Table, Column, Model, DataType } from "sequelize-typescript";

import { uuidv7 } from "../../../../../../../core/ids";

@Table({
    tableName: "oauth_clients",
    timestamps: false,
})
export class OAuthClientModel extends Model {

    @Column({
        primaryKey: true,
        type: DataType.UUID,
        field: 'id',
        defaultValue: () => uuidv7(),
    })
    declare id: string;

    @Column({
        type: DataType.STRING(50),
        allowNull: false,
        field: 'name',
        unique: true,
    })
    declare name: string;

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        field: 'secret',
    })
    declare secret: string;

}
