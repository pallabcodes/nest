'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const roles = [
      {
        name: 'ADMIN',
        description: 'Administrator with full access',
        permissions: JSON.stringify(['*']),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'USER',
        description: 'Regular user',
        permissions: JSON.stringify(['read']),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const existingRoleRows = await queryInterface.sequelize.query(
      'SELECT name FROM roles WHERE name IN (?, ?)',
      {
        replacements: ['ADMIN', 'USER'],
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    const existingRoleNames = existingRoleRows.map((r) => r.name);
    const rolesToInsert = roles.filter(
      (r) => !existingRoleNames.includes(r.name),
    );

    if (rolesToInsert.length > 0) {
      await queryInterface.bulkInsert('roles', rolesToInsert, {
        ignoreDuplicates: true,
      });
    }

    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const users = [
      {
        email: 'admin@example.com',
        password: passwordHash,
        name: 'Admin User',
        phone: '+10000000001',
        isEmailVerified: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        email: 'user@example.com',
        password: passwordHash,
        name: 'Regular User',
        phone: '+10000000002',
        isEmailVerified: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const existingUserRows = await queryInterface.sequelize.query(
      'SELECT email FROM users WHERE email IN (?, ?)',
      {
        replacements: ['admin@example.com', 'user@example.com'],
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    const existingEmails = existingUserRows.map((u) => u.email);
    const usersToInsert = users.filter(
      (u) => !existingEmails.includes(u.email),
    );

    if (usersToInsert.length > 0) {
      await queryInterface.bulkInsert('users', usersToInsert, {
        ignoreDuplicates: true,
      });
    }

    const insertedUsers = await queryInterface.sequelize.query(
      'SELECT id, email FROM users WHERE email IN (?, ?)',
      {
        replacements: ['admin@example.com', 'user@example.com'],
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    const insertedRoles = await queryInterface.sequelize.query(
      'SELECT id, name FROM roles WHERE name IN (?, ?)',
      {
        replacements: ['ADMIN', 'USER'],
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    const userByEmail = {};
    insertedUsers.forEach((u) => {
      userByEmail[u.email] = u.id;
    });

    const roleByName = {};
    insertedRoles.forEach((r) => {
      roleByName[r.name] = r.id;
    });

    const userRoles = [];

    if (userByEmail['admin@example.com'] && roleByName.ADMIN) {
      userRoles.push({
        userId: userByEmail['admin@example.com'],
        roleId: roleByName.ADMIN,
        assignedBy: null,
        reason: 'Initial admin user',
        assignedAt: now,
      });
    }

    if (userByEmail['user@example.com'] && roleByName.USER) {
      userRoles.push({
        userId: userByEmail['user@example.com'],
        roleId: roleByName.USER,
        assignedBy: null,
        reason: 'Initial regular user',
        assignedAt: now,
      });
    }

    if (userRoles.length > 0) {
      await queryInterface.bulkInsert('user_roles', userRoles, {
        ignoreDuplicates: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('user_roles', null, {});
    await queryInterface.bulkDelete(
      'users',
      { email: ['admin@example.com', 'user@example.com'] },
      {},
    );
    await queryInterface.bulkDelete(
      'roles',
      { name: ['ADMIN', 'USER'] },
      {},
    );
  },
};


