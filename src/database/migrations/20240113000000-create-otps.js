'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otps', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('LOGIN', 'RESET', 'VERIFY'),
        allowNull: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('otps', ['userId'], { name: 'idx_otps_user_id' });
    await queryInterface.addIndex('otps', ['code'], { name: 'idx_otps_code' });
    await queryInterface.addIndex('otps', ['expiresAt'], { name: 'idx_otps_expires_at' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('otps');
  },
};

