'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sellers = [
      {
        name: 'TechCorp Inc.',
        email: 'techcorp@example.com',
        phone: '+1-555-0101',
        address: '123 Tech Street, Silicon Valley',
        city: 'San Francisco',
        country: 'USA',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'GadgetWorld Ltd.',
        email: 'gadgetworld@example.com',
        phone: '+1-555-0102',
        address: '456 Gadget Avenue',
        city: 'New York',
        country: 'USA',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'ElectroMart',
        email: 'electromart@example.com',
        phone: '+1-555-0103',
        address: '789 Electric Boulevard',
        city: 'Los Angeles',
        country: 'USA',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'SmartDevices Co.',
        email: 'smartdevices@example.com',
        phone: '+1-555-0104',
        address: '321 Smart Road',
        city: 'Seattle',
        country: 'USA',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Digital Solutions',
        email: 'digitalsolutions@example.com',
        phone: '+1-555-0105',
        address: '654 Digital Drive',
        city: 'Austin',
        country: 'USA',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Check for existing sellers
    const emails = sellers.map((s) => s.email);
    const [existingSellers] = await queryInterface.sequelize.query(
      `SELECT email FROM sellers WHERE email IN (${emails.map(() => '?').join(',')})`,
      { replacements: emails },
    );
    const existingEmails = existingSellers.map((s) => s.email);
    const sellersToInsert = sellers.filter((seller) => !existingEmails.includes(seller.email));

    if (sellersToInsert.length > 0) {
      await queryInterface.bulkInsert('sellers', sellersToInsert, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sellers', {
      email: [
        'techcorp@example.com',
        'gadgetworld@example.com',
        'electromart@example.com',
        'smartdevices@example.com',
        'digitalsolutions@example.com',
      ],
    }, {});
  },
};

