const { Sequelize } = require('sequelize');
const config = require('../src/database/config/sequelize.config.js').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: false,
});

async function ensureSellerIdColumn() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Check if column exists
    const [results] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = '${config.database}' 
       AND TABLE_NAME = 'products' 
       AND COLUMN_NAME = 'sellerId'`
    );

    if (results.length === 0) {
      console.log('⚠️  sellerId column does not exist. Adding it...');
      
      // Add the column
      await sequelize.query(`
        ALTER TABLE \`products\` 
        ADD COLUMN \`sellerId\` INT NULL,
        ADD INDEX \`idx_products_seller_id\` (\`sellerId\`),
        ADD CONSTRAINT \`products_sellerId_fkey\` 
        FOREIGN KEY (\`sellerId\`) REFERENCES \`sellers\`(\`id\`) 
        ON UPDATE CASCADE ON DELETE SET NULL
      `);
      
      console.log('✅ sellerId column added successfully!');
    } else {
      console.log('✅ sellerId column already exists.');
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

ensureSellerIdColumn();

