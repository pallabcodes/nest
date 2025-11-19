import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Op, Sequelize, QueryTypes } from 'sequelize';
import { Product } from '../../database/models/product.model';
import { Seller } from '../../database/models/seller.model';
import {
  getThisMonthFilter,
  getLastNMonthsFilter,
  getDateRangeFilter,
} from '../../common/utils/date.util';

/**
 * ProductRepository - Direct Sequelize usage without BaseRepository
 * 
 * This follows the interview-sandbox pattern:
 * - Direct model injection using @InjectModel
 * - Simple, straightforward Sequelize queries
 * - No abstraction layer that could cause issues in 2-hour interviews
 * - Easy for reviewers to understand
 */
@Injectable()
export class ProductRepository {
  constructor(
    @InjectModel(Product)
    private readonly productModel: typeof Product,
    @InjectModel(Seller)
    private readonly sellerModel: typeof Seller,
    @InjectConnection()
    private readonly sequelize: Sequelize,
  ) {}

  /**
   * Helper method to safely convert a value to a positive integer
   * Returns default value if conversion fails or value is invalid
   */
  private safePositiveInt(value: any, defaultValue: number = 10): number {
    if (value == null || value === undefined || value === '') return defaultValue;
    let num: number;
    if (typeof value === 'string') {
      num = parseInt(value, 10);
    } else if (typeof value === 'number') {
      num = value;
    } else {
      return defaultValue;
    }
    if (isNaN(num) || !isFinite(num) || !Number.isInteger(num) || num <= 0) {
      return defaultValue;
    }
    return Math.floor(Math.abs(num));
  }

  // ============================================
  // BASIC CRUD OPERATIONS
  // ============================================

  /**
   * Create a product
   */
  async create(data: any) {
    return this.productModel.create(data, {
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });
  }

  /**
   * Find product by ID
   */
  async findById(id: number) {
    return this.productModel.findByPk(id, {
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });
  }

  /**
   * Update product by ID
   */
  async update(id: number, data: any) {
    const [affectedCount] = await this.productModel.update(data, {
      where: { id },
    });
    return affectedCount;
  }

  /**
   * Delete product by ID
   */
  async delete(id: number) {
    return this.productModel.destroy({ where: { id } });
  }

  /**
   * Find all products with pagination and filters
   * Handles query parameters and builds where clause
   */
  async findAll(query?: any, options?: { userRole?: string; includeInactive?: boolean; enablePriceFilter?: boolean }) {
    const { page = 1, limit = 10, ...filters } = query || {};
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 10;
    const offset = (safePage - 1) * safeLimit;

    // Build where clause from filters
    const where: any = {};
    
    // Basic filters - always applied
    if (filters.name) {
      where.name = { [Op.like]: `%${filters.name}%` };
    }
    
    // Flag-based conditional filter: Price filtering (only if enabled)
    // Demonstrates adding/removing filters based on feature flags or config
    const priceFilterEnabled = options?.enablePriceFilter !== false && 
                               (process.env.ENABLE_PRICE_FILTER !== 'false');
    if (priceFilterEnabled) {
      if (filters.minPrice) {
        const minPriceNum = parseFloat(filters.minPrice);
        if (!isNaN(minPriceNum) && isFinite(minPriceNum) && minPriceNum >= 0) {
          where.price = { ...where.price, [Op.gte]: minPriceNum };
        }
      }
      if (filters.maxPrice) {
        const maxPriceNum = parseFloat(filters.maxPrice);
        if (!isNaN(maxPriceNum) && isFinite(maxPriceNum) && maxPriceNum >= 0) {
          where.price = { ...where.price, [Op.lte]: maxPriceNum };
        }
      }
    }
    
    // Flag-based conditional filter: isActive handling
    if (options?.includeInactive || options?.userRole === 'admin') {
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive === 'true' || filters.isActive === true;
      }
    } else {
      // Regular users only see active products
      where.isActive = true;
    }
    
    if (filters.sellerId) {
      const sellerIdNum = parseInt(filters.sellerId, 10);
      if (!isNaN(sellerIdNum) && isFinite(sellerIdNum) && sellerIdNum > 0) {
        where.sellerId = sellerIdNum;
      }
    }
    
    // Support field__operator format (e.g., name__like, price__gte)
    Object.keys(filters).forEach((key) => {
      if (key.includes('__')) {
        const [field, operator] = key.split('__');
        const value = filters[key];
        
        if (value === null || value === undefined) return;
        
        switch (operator) {
          case 'like':
            where[field] = { [Op.like]: `%${value}%` };
            break;
          case 'gte':
            const gteVal = parseFloat(value);
            if (!isNaN(gteVal) && isFinite(gteVal)) {
              where[field] = { ...where[field], [Op.gte]: gteVal };
            }
            break;
          case 'lte':
            const lteVal = parseFloat(value);
            if (!isNaN(lteVal) && isFinite(lteVal)) {
              where[field] = { ...where[field], [Op.lte]: lteVal };
            }
            break;
          case 'in':
            where[field] = { [Op.in]: Array.isArray(value) ? value : [value] };
            break;
          default:
            where[field] = value;
        }
      }
    });

    const { rows, count } = await this.productModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    return {
      data: rows,
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(count / safeLimit),
    };
  }

  // ============================================
  // BASIC QUERIES
  // ============================================

  /**
   * Find product by name
   */
  async findByName(name: string) {
    return this.productModel.findOne({
      where: { name },
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });
  }

  /**
   * Find products by price range
   */
  async findByPriceRange(minPrice: number, maxPrice: number) {
    return this.productModel.findAll({
      where: {
        price: {
          [Op.between]: [minPrice, maxPrice],
        },
      },
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });
  }

  /**
   * Find active products
   */
  async findActiveProducts() {
    return this.productModel.findAll({
      where: { isActive: true },
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });
  }

  // ============================================
  // DATE RANGE QUERIES
  // ============================================

  /**
   * Find products added this month with seller information
   * Example: "Products added this month"
   */
  async findAddedThisMonth() {
    return this.productModel.findAll({
      where: {
        ...getThisMonthFilter('createdAt'),
      },
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Find products added in last 3 months with seller information
   */
  async findAddedLast3Months() {
    return this.productModel.findAll({
      where: {
        ...getLastNMonthsFilter('createdAt', 3),
      },
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Find products added in a specific date range with seller information
   */
  async findAddedInDateRange(startDate: Date | string, endDate: Date | string) {
    return this.productModel.findAll({
      where: {
        ...getDateRangeFilter('createdAt', startDate, endDate),
      },
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  // ============================================
  // COMPLEX QUERIES WITH GROUP BY
  // ============================================

  /**
   * Best selling products in this month
   * Note: This is a simplified version. In real scenario, you'd join with order_items table
   */
  async findBestSellingThisMonth(limit: number = 10) {
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    return this.productModel.findAll({
      attributes: [
        'id',
        'name',
        'price',
        [Sequelize.fn('COUNT', Sequelize.col('Product.id')), 'orderCount'],
        [Sequelize.fn('SUM', Sequelize.literal('COALESCE(stock, 0)')), 'totalStock'],
      ],
      where: {
        createdAt: {
          [Op.gte]: thisMonthStart,
        },
        isActive: true,
      },
      group: ['Product.id', 'Product.name', 'Product.price'],
      // Note: HAVING removed - redundant when grouping by primary key (COUNT always >= 1)
      order: [[Sequelize.literal('orderCount'), 'DESC']],
      limit,
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name'],
        },
      ],
    });
  }

  /**
   * Best selling products in last 3 months
   */
  async findBestSellingLast3Months(limit: number = 10) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    return this.productModel.findAll({
      attributes: [
        'id',
        'name',
        'price',
        [Sequelize.fn('COUNT', Sequelize.col('Product.id')), 'orderCount'],
      ],
      where: {
        createdAt: {
          [Op.gte]: threeMonthsAgo,
        },
        isActive: true,
      },
      group: ['Product.id', 'Product.name', 'Product.price'],
      // Note: HAVING removed - redundant when grouping by primary key (COUNT always >= 1)
      order: [[Sequelize.literal('orderCount'), 'DESC']],
      limit,
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name'],
        },
      ],
    });
  }

  /**
   * Products by seller with aggregation
   * Shows product count and average price per seller
   */
  async findProductsBySeller() {
    return this.productModel.findAll({
      attributes: [
        'sellerId',
        [Sequelize.fn('COUNT', Sequelize.col('Product.id')), 'productCount'],
        [Sequelize.fn('AVG', Sequelize.col('Product.price')), 'avgPrice'],
        [Sequelize.fn('MIN', Sequelize.col('Product.price')), 'minPrice'],
        [Sequelize.fn('MAX', Sequelize.col('Product.price')), 'maxPrice'],
      ],
      where: {
        isActive: true,
      },
      group: ['sellerId'],
      // Note: HAVING removed - redundant (COUNT will always be >= 1 for sellers with products)
      order: [[Sequelize.literal('productCount'), 'DESC']],
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });
  }

  // ============================================
  // CONDITIONAL WHERE QUERIES
  // ============================================

  /**
   * Find products with conditional filters
   * Only applies filters that are provided (not null/undefined/empty)
   * Demonstrates dynamic filter building
   */
  async findWithConditionalFilters(filters: {
    name?: string;
    minPrice?: number;
    maxPrice?: number;
    sellerId?: number;
    isActive?: boolean;
  }, options?: { enablePriceFilter?: boolean }) {
    const where: any = {};

    // Always apply name filter if provided
    if (filters.name) {
      where.name = { [Op.like]: `%${filters.name}%` };
    }

    // Conditional filter: Price range (only if feature enabled)
    const priceFilterEnabled = options?.enablePriceFilter !== false && 
                               (process.env.ENABLE_PRICE_FILTER !== 'false');
    if (priceFilterEnabled) {
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        where.price = {};
        if (filters.minPrice !== undefined) {
          where.price[Op.gte] = filters.minPrice;
        }
        if (filters.maxPrice !== undefined) {
          where.price[Op.lte] = filters.maxPrice;
        }
      }
    }

    // Conditional filter: Seller filter (only if provided)
    if (filters.sellerId !== undefined) {
      where.sellerId = filters.sellerId;
    }

    // Conditional filter: Active status (always apply if provided)
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.productModel.findAll({
      where,
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Find products with complex filters using Op.and / Op.or
   * Demonstrates advanced conditional filtering
   */
  async findAllWithComplexFilters(query?: any) {
    const { page = 1, limit = 10, name, description, minPrice, maxPrice, sellerId, inStock } = query || {};
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 10;
    const offset = (safePage - 1) * safeLimit;

    const where: any = {
      isActive: true,
    };

    // Op.and example: Multiple conditions that must all be true
    const andConditions: any[] = [];

    // Op.or example: Either name OR description matches
    if (name || description) {
      const orConditions: any[] = [];
      if (name) {
        orConditions.push({ name: { [Op.like]: `%${name}%` } });
      }
      if (description) {
        orConditions.push({ description: { [Op.like]: `%${description}%` } });
      }
      if (orConditions.length > 0) {
        andConditions.push({ [Op.or]: orConditions });
      }
    }

    // Price range with Op.and
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceCondition: any = {};
      if (minPrice !== undefined) {
        const minPriceNum = parseFloat(minPrice);
        if (!isNaN(minPriceNum) && isFinite(minPriceNum) && minPriceNum >= 0) {
          priceCondition[Op.gte] = minPriceNum;
        }
      }
      if (maxPrice !== undefined) {
        const maxPriceNum = parseFloat(maxPrice);
        if (!isNaN(maxPriceNum) && isFinite(maxPriceNum) && maxPriceNum >= 0) {
          priceCondition[Op.lte] = maxPriceNum;
        }
      }
      if (Object.keys(priceCondition).length > 0) {
        andConditions.push({ price: priceCondition });
      }
    }

    if (sellerId) {
      const sellerIdNum = parseInt(sellerId, 10);
      if (!isNaN(sellerIdNum) && isFinite(sellerIdNum) && sellerIdNum > 0) {
        andConditions.push({ sellerId: sellerIdNum });
      }
    }

    // Conditional filter: Stock filter (only if inStock flag is provided)
    if (inStock === 'true' || inStock === true) {
      andConditions.push({ stock: { [Op.gt]: 0 } });
    }

    // Apply Op.and if we have multiple conditions
    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    const { rows, count } = await this.productModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          // Conditional include: INNER JOIN if sellerId filter is provided
          ...(sellerId ? {
            required: true, // INNER JOIN when filtering by seller
          } : {
            required: false, // LEFT JOIN when not filtering
          }),
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    return {
      data: rows,
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(count / safeLimit),
    };
  }

  // ============================================
  // RAW QUERIES
  // ============================================

  /**
   * Find products added today using raw SQL
   * RAW SQL VERSION (kept for reference)
   */
  async findAddedTodayRaw() {
    if (!this.sequelize) {
      throw new Error('Sequelize connection not available');
    }
    return this.sequelize.query(
      `SELECT p.*, s.name as sellerName, s.email as sellerEmail 
       FROM products p 
       LEFT JOIN sellers s ON p.sellerId = s.id 
       WHERE DATE(p.createdAt) = CURDATE() 
       ORDER BY p.createdAt DESC`,
      {
        type: QueryTypes.SELECT,
        model: this.productModel,
        mapToModel: true,
      },
    );
  }

  /**
   * Find products added today using Sequelize ORM
   * SEQUELIZE ORM VERSION - Demonstrates date filtering with Sequelize
   */
  async findAddedToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.productModel.findAll({
      where: {
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
      },
      include: [
        {
          model: this.sellerModel,
          as: 'seller',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Find best selling products using raw SQL with complex aggregation
   */
  async findBestSellingRaw(limit: number = 10) {
    if (!this.sequelize) {
      throw new Error('Sequelize connection not available');
    }
    return this.sequelize.query(
      `SELECT 
         p.id,
         p.name,
         p.price,
         COUNT(p.id) as orderCount,
         AVG(p.price) as avgPrice,
         s.name as sellerName
       FROM products p
       LEFT JOIN sellers s ON p.sellerId = s.id
       WHERE p.isActive = true
         AND p.createdAt >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
       GROUP BY p.id, p.name, p.price, s.name
       -- Note: HAVING removed - redundant when grouping by primary key (COUNT always >= 1)
       ORDER BY orderCount DESC
       LIMIT ${this.safePositiveInt(limit ?? 10, 10)}`,
      {
        type: QueryTypes.SELECT,
      },
    );
  }

  // ============================================
  // AGGREGATION QUERIES
  // ============================================

  /**
   * Get product statistics
   */
  async getProductStatistics() {
    return this.productModel.findAll({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalProducts'],
        [Sequelize.fn('SUM', Sequelize.col('stock')), 'totalStock'],
        [Sequelize.fn('AVG', Sequelize.col('price')), 'avgPrice'],
        [Sequelize.fn('MIN', Sequelize.col('price')), 'minPrice'],
        [Sequelize.fn('MAX', Sequelize.col('price')), 'maxPrice'],
      ],
      where: {
        isActive: true,
      },
    });
  }

  /**
   * Get product statistics by seller
   */
  async getProductStatisticsBySeller() {
    return this.productModel.findAll({
      attributes: [
        'sellerId',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'productCount'],
        [Sequelize.fn('SUM', Sequelize.col('stock')), 'totalStock'],
        [Sequelize.fn('AVG', Sequelize.col('price')), 'avgPrice'],
      ],
      where: {
        isActive: true,
      },
      group: ['sellerId'],
      order: [[Sequelize.literal('productCount'), 'DESC']],
    });
  }
}
