/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("audit_events", {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
            },
            entity: {
                type: Sequelize.STRING(80),
                allowNull: false,
            },
            entity_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            action: {
                type: Sequelize.STRING(40),
                allowNull: false,
            },
            actor_id: {
                type: Sequelize.UUID,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("audit_events");
    },
};
