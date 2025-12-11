'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { BIGINT, STRING } = Sequelize;

    await queryInterface.addColumn('courses', 'price', {
      type: BIGINT,
      allowNull: true,
      comment: 'Price in minor units (for example cents)',
    });

    await queryInterface.addColumn('courses', 'currency', {
      type: STRING(10),
      allowNull: true,
      comment: 'Currency code for price, for example usd',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('courses', 'currency');
    await queryInterface.removeColumn('courses', 'price');
  },
};

