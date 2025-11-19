'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const courses = [
      {
        name: 'Introduction to Programming',
        code: 'CS101',
        description: 'Fundamentals of programming and problem solving',
        credits: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Data Structures and Algorithms',
        code: 'CS201',
        description: 'Advanced data structures and algorithm design',
        credits: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Database Systems',
        code: 'CS301',
        description: 'Design and implementation of database systems',
        credits: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Linear Algebra',
        code: 'MATH201',
        description: 'Vector spaces, matrices, and linear transformations',
        credits: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Quantum Mechanics',
        code: 'PHYS301',
        description: 'Introduction to quantum physics principles',
        credits: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Check for existing courses
    const codes = courses.map((c) => c.code);
    const [existingCourses] = await queryInterface.sequelize.query(
      `SELECT code FROM courses WHERE code IN (${codes.map(() => '?').join(',')})`,
      { replacements: codes },
    );
    const existingCodes = existingCourses.map((c) => c.code);
    const coursesToInsert = courses.filter((course) => !existingCodes.includes(course.code));

    if (coursesToInsert.length > 0) {
      await queryInterface.bulkInsert('courses', coursesToInsert, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('courses', {
      code: ['CS101', 'CS201', 'CS301', 'MATH201', 'PHYS301'],
    }, {});
  },
};

