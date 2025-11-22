'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
      {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        phone: '+1234567890',
        isEmailVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'moderator@example.com',
        password: hashedPassword,
        name: 'Moderator User',
        phone: '+1234567891',
        isEmailVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'user@example.com',
        password: hashedPassword,
        name: 'Regular User',
        phone: '+1234567892',
        isEmailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Check for existing users
    const emails = users.map((u) => u.email);
    const [existingUsers] = await queryInterface.sequelize.query(
      `SELECT email FROM users WHERE email IN (${emails.map(() => '?').join(',')})`,
      { replacements: emails },
    );
    const existingEmails = existingUsers.map((u) => u.email);
    const usersToInsert = users.filter((user) => !existingEmails.includes(user.email));

    if (usersToInsert.length > 0) {
      await queryInterface.bulkInsert('users', usersToInsert, {});
      
      // Get inserted user IDs by querying back
      const emails = usersToInsert.map((u) => u.email);
      const [insertedUsers] = await queryInterface.sequelize.query(
        `SELECT id, email FROM users WHERE email IN (${emails.map(() => '?').join(',')})`,
        { replacements: emails },
      );

      // Get role IDs
    const [roles] = await queryInterface.sequelize.query(
        `SELECT id, name FROM roles WHERE name IN ('ADMIN', 'MODERATOR', 'USER')`,
    );
    const roleMap = {};
    roles.forEach((role) => {
      roleMap[role.name] = role.id;
    });

      // Create user-role mapping
    const userMap = {};
      insertedUsers.forEach((user) => {
      userMap[user.email] = user.id;
    });

      // Assign roles
      const userRoles = [];
      usersToInsert.forEach((user) => {
        const userId = userMap[user.email];
        if (user.email === 'admin@example.com' && roleMap.ADMIN && userId) {
          userRoles.push({
            userId,
            roleId: roleMap.ADMIN,
        assignedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        if (user.email === 'moderator@example.com' && roleMap.MODERATOR && userId) {
          userRoles.push({
            userId,
            roleId: roleMap.MODERATOR,
        assignedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        if (user.email === 'user@example.com' && roleMap.USER && userId) {
          userRoles.push({
            userId,
            roleId: roleMap.USER,
        assignedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      });

      if (userRoles.length > 0) {
    await queryInterface.bulkInsert('user_roles', userRoles);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('user_roles', null, {});
    await queryInterface.bulkDelete('users', {
      email: ['admin@example.com', 'moderator@example.com', 'user@example.com'],
    }, {});
  },
};

