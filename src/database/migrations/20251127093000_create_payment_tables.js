'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, BIGINT, ENUM, JSON, DATE, BOOLEAN } = Sequelize;

    // Orders
    await queryInterface.createTable('orders', {
      id: {
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: ENUM(
          'pending',
          'awaiting_payment',
          'paid',
          'failed',
          'canceled',
          'refunded',
          'partially_refunded',
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      type: {
        type: ENUM('one_time', 'subscription'),
        allowNull: false,
        defaultValue: 'one_time',
      },
      totalAmount: {
        type: BIGINT,
        allowNull: false,
        comment: 'Total amount in minor units (for example cents)',
      },
      currency: {
        type: STRING(10),
        allowNull: false,
      },
      clientReferenceId: {
        type: STRING(255),
        allowNull: true,
        comment: 'External or client side reference id',
      },
      idempotencyKey: {
        type: STRING(255),
        allowNull: false,
        unique: true,
      },
      metadata: {
        type: JSON,
        allowNull: true,
      },
      createdAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('orders', ['userId', 'createdAt'], {
      name: 'idx_orders_user_created_at',
    });
    await queryInterface.addIndex('orders', ['idempotencyKey'], {
      name: 'uq_orders_idempotency_key',
      unique: true,
    });

    // Order items
    await queryInterface.createTable('order_items', {
      id: {
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      orderId: {
        type: INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      purchasableType: {
        type: STRING(50),
        allowNull: false,
      },
      purchasableId: {
        type: INTEGER,
        allowNull: false,
      },
      quantity: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      unitAmount: {
        type: BIGINT,
        allowNull: false,
        comment: 'Unit amount in minor units',
      },
      currency: {
        type: STRING(10),
        allowNull: false,
      },
      metadata: {
        type: JSON,
        allowNull: true,
      },
      createdAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('order_items', ['orderId'], {
      name: 'idx_order_items_order_id',
    });
    await queryInterface.addIndex('order_items', ['purchasableType', 'purchasableId'], {
      name: 'idx_order_items_purchasable',
    });

    // Payments
    await queryInterface.createTable('payments', {
      id: {
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      orderId: {
        type: INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      provider: {
        type: ENUM('stripe'),
        allowNull: false,
        defaultValue: 'stripe',
      },
      status: {
        type: ENUM(
          'requires_payment_method',
          'requires_action',
          'processing',
          'succeeded',
          'failed',
          'canceled',
        ),
        allowNull: false,
        defaultValue: 'requires_payment_method',
      },
      amount: {
        type: BIGINT,
        allowNull: false,
        comment: 'Payment amount in minor units',
      },
      currency: {
        type: STRING(10),
        allowNull: false,
      },
      stripePaymentIntentId: {
        type: STRING(255),
        allowNull: true,
        unique: true,
      },
      stripeCheckoutSessionId: {
        type: STRING(255),
        allowNull: true,
        unique: true,
      },
      stripeCustomerId: {
        type: STRING(255),
        allowNull: true,
      },
      stripeSubscriptionId: {
        type: STRING(255),
        allowNull: true,
      },
      idempotencyKey: {
        type: STRING(255),
        allowNull: false,
        unique: true,
      },
      metadata: {
        type: JSON,
        allowNull: true,
      },
      createdAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('payments', ['orderId'], {
      name: 'idx_payments_order_id',
    });
    await queryInterface.addIndex('payments', ['userId'], {
      name: 'idx_payments_user_id',
    });

    // Subscriptions
    await queryInterface.createTable('subscriptions', {
      id: {
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      stripeSubscriptionId: {
        type: STRING(255),
        allowNull: false,
        unique: true,
      },
      status: {
        type: ENUM(
          'incomplete',
          'incomplete_expired',
          'trialing',
          'active',
          'past_due',
          'canceled',
          'unpaid',
        ),
        allowNull: false,
      },
      currentPeriodStart: {
        type: DATE,
        allowNull: true,
      },
      currentPeriodEnd: {
        type: DATE,
        allowNull: true,
      },
      cancelAtPeriodEnd: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      canceledAt: {
        type: DATE,
        allowNull: true,
      },
      currency: {
        type: STRING(10),
        allowNull: true,
      },
      priceId: {
        type: STRING(255),
        allowNull: true,
      },
      productId: {
        type: STRING(255),
        allowNull: true,
      },
      metadata: {
        type: JSON,
        allowNull: true,
      },
      createdAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('subscriptions', ['userId'], {
      name: 'idx_subscriptions_user_id',
    });
  },

  down: async (queryInterface) => {
    // Drop in reverse dependency order and clean up enums
    await queryInterface.dropTable('subscriptions');
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('order_items');
    await queryInterface.dropTable('orders');
  },
};

