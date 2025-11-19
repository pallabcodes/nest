'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const roles = [
      {
        name: 'ADMIN',
        description: 'Administrator with full access',
        permissions: JSON.stringify(['*']),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'MODERATOR',
        description: 'Moderator with limited admin access',
        permissions: JSON.stringify(['read', 'update', 'delete']),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'USER',
        description: 'Regular user',
        permissions: JSON.stringify(['read']),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Check for existing roles
    const [existingRoles] = await queryInterface.sequelize.query(
      `SELECT name FROM roles WHERE name IN ('ADMIN', 'MODERATOR', 'USER')`,
    );
    const existingRoleNames = existingRoles.map((r) => r.name);
    const rolesToInsert = roles.filter((role) => !existingRoleNames.includes(role.name));

    if (rolesToInsert.length > 0) {
      await queryInterface.bulkInsert('roles', rolesToInsert, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', {
      name: ['ADMIN', 'MODERATOR', 'USER'],
    }, {});
  },
};

