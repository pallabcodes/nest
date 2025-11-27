'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('players', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      position: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      country: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('players', { fields: ['name'] });
    await queryInterface.addIndex('players', { fields: ['isActive'] });

    await queryInterface.createTable('teams', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      city: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('teams', { fields: ['name'], unique: true });
    await queryInterface.addIndex('teams', { fields: ['isActive'] });

    await queryInterface.createTable('auctions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      startsAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      endsAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('auctions', { fields: ['name'] });
    await queryInterface.addIndex('auctions', { fields: ['status'] });

    await queryInterface.createTable('quotations', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      auctionId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'auctions',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      playerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'players',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      teamId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'teams',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'USD',
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'ACCEPTED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('quotations', { fields: ['playerId'] });
    await queryInterface.addIndex('quotations', { fields: ['teamId'] });
    await queryInterface.addIndex('quotations', {
      fields: ['playerId', 'teamId'],
      name: 'idx_quotations_player_team',
    });
    await queryInterface.addIndex('quotations', { fields: ['auctionId'] });
    await queryInterface.addIndex('quotations', {
      fields: ['auctionId', 'playerId'],
      name: 'idx_quotations_auction_player',
    });
    await queryInterface.addIndex('quotations', {
      fields: ['auctionId', 'playerId', 'teamId'],
      unique: true,
      name: 'idx_quotations_auction_player_team',
    });
    await queryInterface.addIndex('quotations', { fields: ['status'] });

    await queryInterface.createTable('quotation_history', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      quotationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'quotations',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      auctionId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'auctions',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      playerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'players',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      teamId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'teams',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'USD',
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'ACCEPTED', 'REJECTED'),
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('quotation_history', {
      fields: ['quotationId'],
    });

    await queryInterface.addIndex('quotation_history', {
      fields: ['auctionId', 'playerId', 'teamId', 'createdAt'],
      name: 'idx_quotation_history_auction_player_team_created',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('quotation_history');
    await queryInterface.dropTable('quotations');
    await queryInterface.dropTable('auctions');
    await queryInterface.dropTable('teams');
    await queryInterface.dropTable('players');
  },
};


