'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const teachers = [
      {
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        phone: '+1-555-1001',
        specialization: 'Algorithms and Data Structures',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@university.edu',
        phone: '+1-555-1002',
        specialization: 'Database Systems',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Dr. Michael Brown',
        email: 'michael.brown@university.edu',
        phone: '+1-555-1003',
        specialization: 'Linear Algebra',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Dr. Emily Davis',
        email: 'emily.davis@university.edu',
        phone: '+1-555-1004',
        specialization: 'Quantum Physics',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Dr. Robert Wilson',
        email: 'robert.wilson@university.edu',
        phone: '+1-555-1005',
        specialization: 'Organic Chemistry',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Dr. Lisa Anderson',
        email: 'lisa.anderson@university.edu',
        phone: '+1-555-1006',
        specialization: 'Molecular Biology',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Check for existing teachers
    const emails = teachers.map((t) => t.email);
    const [existingTeachers] = await queryInterface.sequelize.query(
      `SELECT email FROM teachers WHERE email IN (${emails.map(() => '?').join(',')})`,
      { replacements: emails },
    );
    const existingEmails = existingTeachers.map((t) => t.email);
    const teachersToInsert = teachers.filter((teacher) => !existingEmails.includes(teacher.email));

    if (teachersToInsert.length > 0) {
      await queryInterface.bulkInsert('teachers', teachersToInsert, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('teachers', {
      email: [
        'john.smith@university.edu',
        'sarah.johnson@university.edu',
        'michael.brown@university.edu',
        'emily.davis@university.edu',
        'robert.wilson@university.edu',
        'lisa.anderson@university.edu',
      ],
    }, {});
  },
};

