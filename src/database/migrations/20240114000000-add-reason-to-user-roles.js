'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_roles', 'reason', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Optional reason or context for role assignment',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('user_roles', 'reason');
  },
};

