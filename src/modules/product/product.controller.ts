import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseArrayPipe,
  ParseIntPipe,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductQueryDto } from './dto/search-product-query.dto';
import { FindAllProductQueryDto } from './dto/find-all-product-query.dto';
import { ProductResponseMapper } from './mappers/product-response.mapper';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('Product')
@Controller('products')
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(
    private readonly productService: ProductService,
    private readonly responseMapper: ProductResponseMapper,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(@Body() createDto: CreateProductDto) {
    const result = await this.productService.create(createDto);
    return this.responseMapper.toCreateResponse(result);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'List of products' })
  async findAll(@Query() query: FindAllProductQueryDto) {
    const result = await this.productService.findAll(query);
    const paginated = this.responseMapper.toPaginatedResponse(
      result.data,
      result.page,
      result.limit,
      result.total,
    );
    // Wrap in standard API response format
    return {
      success: true,
      data: paginated,
    };
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search products with filters' })
  @ApiResponse({ status: 200, description: 'Filtered products' })
  async search(@Query() query: SearchProductQueryDto) {
    const { name, minPrice, maxPrice, page = 1, limit = 10 } = query;
    const filters: any = {};
    if (name) filters.name__like = name;
    if (minPrice !== undefined) filters.price__gte = minPrice;
    if (maxPrice !== undefined) filters.price__lte = maxPrice;
    
    const result = await this.productService.findAll({ ...filters, page, limit });
    const paginated = this.responseMapper.toPaginatedResponse(
      result.data,
      result.page,
      result.limit,
      result.total,
    );
    // Wrap in standard API response format
    return {
      success: true,
      data: paginated,
    };
  }


  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productService.findOne(id);
    return this.responseMapper.toResponse(product);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    const product = await this.productService.update(id, updateProductDto);
    return this.responseMapper.toResponse(product);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product (Admin only)' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productService.remove(id);
    return this.responseMapper.toDeleteResponse(id);
  }
}
