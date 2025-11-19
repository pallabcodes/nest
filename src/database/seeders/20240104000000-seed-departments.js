'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const departments = [
      {
        name: 'Computer Science',
        description: 'Department of Computer Science and Engineering',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Mathematics',
        description: 'Department of Mathematics and Statistics',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Physics',
        description: 'Department of Physics and Astronomy',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Chemistry',
        description: 'Department of Chemistry',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Biology',
        description: 'Department of Biology and Life Sciences',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Check for existing departments
    const names = departments.map((d) => d.name);
    const [existingDepartments] = await queryInterface.sequelize.query(
      `SELECT name FROM departments WHERE name IN (${names.map(() => '?').join(',')})`,
      { replacements: names },
    );
    const existingNames = existingDepartments.map((d) => d.name);
    const departmentsToInsert = departments.filter((dept) => !existingNames.includes(dept.name));

    if (departmentsToInsert.length > 0) {
      await queryInterface.bulkInsert('departments', departmentsToInsert, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('departments', {
      name: ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology'],
    }, {});
  },
};

