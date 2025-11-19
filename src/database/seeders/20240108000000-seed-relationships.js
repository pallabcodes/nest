'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get IDs from seeded data
    const [departments] = await queryInterface.sequelize.query(
      `SELECT id, name FROM departments ORDER BY id`,
    );
    const [teachers] = await queryInterface.sequelize.query(
      `SELECT id, name FROM teachers ORDER BY id`,
    );
    const [students] = await queryInterface.sequelize.query(
      `SELECT id, name FROM students ORDER BY id`,
    );
    const [courses] = await queryInterface.sequelize.query(
      `SELECT id, code FROM courses ORDER BY id`,
    );

    // Map names to IDs
    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d.name] = d.id;
    });

    const teacherMap = {};
    teachers.forEach((t, idx) => {
      teacherMap[idx] = t.id;
    });

    const studentMap = {};
    students.forEach((s, idx) => {
      studentMap[idx] = s.id;
    });

    const courseMap = {};
    courses.forEach((c, idx) => {
      courseMap[idx] = c.id;
    });

    const now = new Date();

    // Teacher ↔ Department relationships
    const teacherDepartments = [
      {
        teacherId: teacherMap[0], // Dr. John Smith
        departmentId: deptMap['Computer Science'],
        role: 'Head',
        assignedAt: now,
        updatedAt: now,
      },
      {
        teacherId: teacherMap[1], // Dr. Sarah Johnson
        departmentId: deptMap['Computer Science'],
        role: 'Member',
        assignedAt: now,
        updatedAt: now,
      },
      {
        teacherId: teacherMap[2], // Dr. Michael Brown
        departmentId: deptMap['Mathematics'],
        role: 'Head',
        assignedAt: now,
        updatedAt: now,
      },
      {
        teacherId: teacherMap[3], // Dr. Emily Davis
        departmentId: deptMap['Physics'],
        role: 'Head',
        assignedAt: now,
        updatedAt: now,
      },
      {
        teacherId: teacherMap[4], // Dr. Robert Wilson
        departmentId: deptMap['Chemistry'],
        role: 'Head',
        assignedAt: now,
        updatedAt: now,
      },
      {
        teacherId: teacherMap[5], // Dr. Lisa Anderson
        departmentId: deptMap['Biology'],
        role: 'Head',
        assignedAt: now,
        updatedAt: now,
      },
    ];

    // Course ↔ Teacher relationships
    const courseTeachers = [
      {
        courseId: courseMap[0], // CS101
        teacherId: teacherMap[0], // Dr. John Smith
        role: 'Instructor',
        assignedAt: now,
        updatedAt: now,
      },
      {
        courseId: courseMap[1], // CS201
        teacherId: teacherMap[0], // Dr. John Smith
        role: 'Instructor',
        assignedAt: now,
        updatedAt: now,
      },
      {
        courseId: courseMap[2], // CS301
        teacherId: teacherMap[1], // Dr. Sarah Johnson
        role: 'Instructor',
        assignedAt: now,
        updatedAt: now,
      },
      {
        courseId: courseMap[3], // MATH201
        teacherId: teacherMap[2], // Dr. Michael Brown
        role: 'Instructor',
        assignedAt: now,
        updatedAt: now,
      },
      {
        courseId: courseMap[4], // PHYS301
        teacherId: teacherMap[3], // Dr. Emily Davis
        role: 'Instructor',
        assignedAt: now,
        updatedAt: now,
      },
    ];

    // Student ↔ Course enrollments
    const enrollments = [
      {
        studentId: studentMap[0], // Alice
        courseId: courseMap[0], // CS101
        status: 'enrolled',
        enrolledAt: now,
        updatedAt: now,
      },
      {
        studentId: studentMap[0], // Alice
        courseId: courseMap[1], // CS201
        status: 'enrolled',
        enrolledAt: now,
        updatedAt: now,
      },
      {
        studentId: studentMap[1], // Bob
        courseId: courseMap[0], // CS101
        status: 'enrolled',
        enrolledAt: now,
        updatedAt: now,
      },
      {
        studentId: studentMap[1], // Bob
        courseId: courseMap[3], // MATH201
        status: 'enrolled',
        enrolledAt: now,
        updatedAt: now,
      },
      {
        studentId: studentMap[2], // Charlie
        courseId: courseMap[2], // CS301
        status: 'enrolled',
        enrolledAt: now,
        updatedAt: now,
      },
      {
        studentId: studentMap[3], // Diana
        courseId: courseMap[4], // PHYS301
        status: 'enrolled',
        enrolledAt: now,
        updatedAt: now,
      },
      {
        studentId: studentMap[4], // Ethan
        courseId: courseMap[0], // CS101
        status: 'enrolled',
        enrolledAt: now,
        updatedAt: now,
      },
    ];

    // Insert relationships (check for duplicates)
    if (teacherDepartments.length > 0) {
      await queryInterface.bulkInsert('teacher_departments', teacherDepartments, {
        ignoreDuplicates: true,
      });
    }

    if (courseTeachers.length > 0) {
      await queryInterface.bulkInsert('course_teachers', courseTeachers, {
        ignoreDuplicates: true,
      });
    }

    if (enrollments.length > 0) {
      await queryInterface.bulkInsert('enrollments', enrollments, {
        ignoreDuplicates: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('enrollments', null, {});
    await queryInterface.bulkDelete('course_teachers', null, {});
    await queryInterface.bulkDelete('teacher_departments', null, {});
  },
};

