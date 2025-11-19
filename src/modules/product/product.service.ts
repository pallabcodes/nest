import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async create(createDto: CreateProductDto) {
    return this.productRepository.create(createDto);
  }

  async findAll(query?: any) {
    return this.productRepository.findAll(query);
  }

  async findOne(id: number) {
    const product = await this.productRepository.findById(id);
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    return product;
  }

  async update(id: number, updateDto: UpdateProductDto) {
    const product = await this.findOne(id);
    
    await this.productRepository.update(id, updateDto);
    
    return this.productRepository.findById(id);
  }

  async remove(id: number) {
    const product = await this.findOne(id);
    await this.productRepository.delete(id);
    return product;
  }
}
