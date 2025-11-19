import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { ProductResponseMapper } from './mappers/product-response.mapper';
import { Product } from '../../database/models/product.model';
import { Seller } from '../../database/models/seller.model';

@Module({
  imports: [
    SequelizeModule.forFeature([Product, Seller]),
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository, ProductResponseMapper],
  exports: [ProductService, ProductRepository],
})
export class ProductModule {}
