'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Alter the createdAt column to have a default value
    await queryInterface.changeColumn('otps', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert to original (though this might cause issues)
    await queryInterface.changeColumn('otps', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
    });
  },
};

