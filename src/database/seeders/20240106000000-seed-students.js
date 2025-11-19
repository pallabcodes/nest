'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const students = [
      {
        name: 'Alice Johnson',
        email: 'alice.johnson@student.edu',
        phone: '+1-555-2001',
        studentId: 'STU001',
        dateOfBirth: new Date('2000-01-15'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Bob Williams',
        email: 'bob.williams@student.edu',
        phone: '+1-555-2002',
        studentId: 'STU002',
        dateOfBirth: new Date('2000-03-22'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Charlie Brown',
        email: 'charlie.brown@student.edu',
        phone: '+1-555-2003',
        studentId: 'STU003',
        dateOfBirth: new Date('1999-07-10'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Diana Martinez',
        email: 'diana.martinez@student.edu',
        phone: '+1-555-2004',
        studentId: 'STU004',
        dateOfBirth: new Date('2001-05-18'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Ethan Taylor',
        email: 'ethan.taylor@student.edu',
        phone: '+1-555-2005',
        studentId: 'STU005',
        dateOfBirth: new Date('2000-11-30'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Check for existing students
    const emails = students.map((s) => s.email);
    const [existingStudents] = await queryInterface.sequelize.query(
      `SELECT email FROM students WHERE email IN (${emails.map(() => '?').join(',')})`,
      { replacements: emails },
    );
    const existingEmails = existingStudents.map((s) => s.email);
    const studentsToInsert = students.filter((student) => !existingEmails.includes(student.email));

    if (studentsToInsert.length > 0) {
      await queryInterface.bulkInsert('students', studentsToInsert, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('students', {
      email: [
        'alice.johnson@student.edu',
        'bob.williams@student.edu',
        'charlie.brown@student.edu',
        'diana.martinez@student.edu',
        'ethan.taylor@student.edu',
      ],
    }, {});
  },
};

