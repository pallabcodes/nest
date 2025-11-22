#!/usr/bin/env node

/**
 * Module Generator Script
 *
 * Cross-platform script to generate NestJS module structure:
 * - Controller
 * - Service
 * - Repository (extending BaseRepository)
 * - Module file
 * - DTO folder with example DTO
 * - Mapper folder with example mapper
 *
 * Usage:
 *   node scripts/generate-module.js <ModuleName>
 *   npm run generate:module <ModuleName>
 *
 * Example:
 *   npm run generate:module Product
 *   Creates: src/modules/product/ with all files
 */

const fs = require('fs');
const path = require('path');

// Get module name from command line
const moduleName = process.argv[2];

if (!moduleName) {
  console.error('❌ Error: Module name is required');
  console.log('Usage: npm run generate:module <ModuleName>');
  console.log('Example: npm run generate:module Product');
  process.exit(1);
}

// Validate module name (PascalCase)
if (!/^[A-Z][a-zA-Z0-9]*$/.test(moduleName)) {
  console.error('❌ Error: Module name must be in PascalCase (e.g., Product, UserProfile)');
  process.exit(1);
}

const moduleNameLower = moduleName.charAt(0).toLowerCase() + moduleName.slice(1);
const moduleNameUpper = moduleName.toUpperCase();
const modulePath = path.join(__dirname, '..', 'src', 'modules', moduleNameLower);

// Check if module already exists
if (fs.existsSync(modulePath)) {
  console.error(`❌ Error: Module "${moduleNameLower}" already exists at ${modulePath}`);
  process.exit(1);
}

// Create directories
const dirs = [
  modulePath,
  path.join(modulePath, 'dto'),
  path.join(modulePath, 'mappers'),
];

dirs.forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`✅ Created directory: ${path.relative(process.cwd(), dir)}`);
});

// Helper function to write file
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Created file: ${path.relative(process.cwd(), filePath)}`);
}

// 1. Controller
const controllerContent = `import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ${moduleName}Service } from './${moduleNameLower}.service';
import { Create${moduleName}Dto } from './dto/create-${moduleNameLower}.dto';
import { Update${moduleName}Dto } from './dto/update-${moduleNameLower}.dto';
import { ${moduleName}ResponseMapper } from './mappers/${moduleNameLower}-response.mapper';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('${moduleName}')
@Controller('${moduleNameLower}')
export class ${moduleName}Controller {
  constructor(
    private readonly ${moduleNameLower}Service: ${moduleName}Service,
    private readonly responseMapper: ${moduleName}ResponseMapper,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new ${moduleNameLower}' })
  @ApiResponse({ status: 201, description: '${moduleName} created successfully' })
  async create(@Body() createDto: Create${moduleName}Dto) {
    const result = await this.${moduleNameLower}Service.create(createDto);
    return this.responseMapper.toCreateResponse(result);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all ${moduleNameLower}s' })
  @ApiResponse({ status: 200, description: 'List of ${moduleNameLower}s' })
  async findAll(@Query() query: any) {
    const result = await this.${moduleNameLower}Service.findAll(query);
    return this.responseMapper.toListResponse(result);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get ${moduleNameLower} by ID' })
  @ApiResponse({ status: 200, description: '${moduleName} found' })
  @ApiResponse({ status: 404, description: '${moduleName} not found' })
  async findOne(@Param('id') id: string) {
    const result = await this.${moduleNameLower}Service.findOne(+id);
    return this.responseMapper.toReadResponse(result);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ${moduleNameLower}' })
  @ApiResponse({ status: 200, description: '${moduleName} updated successfully' })
  @ApiResponse({ status: 404, description: '${moduleName} not found' })
  async update(@Param('id') id: string, @Body() updateDto: Update${moduleName}Dto) {
    const result = await this.${moduleNameLower}Service.update(+id, updateDto);
    return this.responseMapper.toUpdateResponse(result);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete ${moduleNameLower}' })
  @ApiResponse({ status: 204, description: '${moduleName} deleted successfully' })
  @ApiResponse({ status: 404, description: '${moduleName} not found' })
  async remove(@Param('id') id: string) {
    await this.${moduleNameLower}Service.remove(+id);
    return this.responseMapper.toDeleteResponse(+id);
  }
}
`;

writeFile(path.join(modulePath, `${moduleNameLower}.controller.ts`), controllerContent);

// 2. Service
const serviceContent = `import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ${moduleName}Repository } from './${moduleNameLower}.repository';
import { Create${moduleName}Dto } from './dto/create-${moduleNameLower}.dto';
import { Update${moduleName}Dto } from './dto/update-${moduleNameLower}.dto';

@Injectable()
export class ${moduleName}Service {
  private readonly logger = new Logger(${moduleName}Service.name);

  constructor(private readonly ${moduleNameLower}Repository: ${moduleName}Repository) {}

  async create(createDto: Create${moduleName}Dto) {
    return this.${moduleNameLower}Repository.create(createDto);
  }

  async findAll(query?: any) {
    const { page = 1, limit = 10, ...filters } = query || {};
    return this.${moduleNameLower}Repository.searchWithFilters({
      filters,
      page: +page,
      limit: +limit,
    });
  }

  async findOne(id: number) {
    const item = await this.${moduleNameLower}Repository.findById(id);
    if (!item) {
      throw new NotFoundException(\`${moduleName} with ID \${id} not found\`);
    }
    return item;
  }

  async update(id: number, updateDto: Update${moduleName}Dto) {
    const item = await this.findOne(id);
    const [affectedCount] = await this.${moduleNameLower}Repository.updateById(id, updateDto);
    if (affectedCount === 0) {
      throw new NotFoundException(\`${moduleName} with ID \${id} not found\`);
    }
    return this.${moduleNameLower}Repository.findById(id);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.${moduleNameLower}Repository.deleteById(id);
    return item;
  }
}
`;

writeFile(path.join(modulePath, `${moduleNameLower}.service.ts`), serviceContent);

// 3. Repository
const repositoryContent = `import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize';
import { BaseRepository } from '../../database/repositories/base.repository';
import { TransactionUtil } from '../../database/utils/transaction.util';
// TODO: Import your model here
// import { ${moduleName} } from '../../database/models/${moduleNameLower}.model';

@Injectable()
export class ${moduleName}Repository extends BaseRepository<any> {
  constructor(
    // TODO: Replace 'any' with your actual model type
    @InjectModel(null as any) // Replace null with your model
    model: any,
    @InjectConnection() sequelize: Sequelize,
    transactionUtil: TransactionUtil,
  ) {
    super(model, sequelize, transactionUtil);
  }

  // Add custom repository methods here if needed
  // Example:
  // async findByName(name: string) {
  //   return this.findOne({ name });
  // }
}
`;

writeFile(path.join(modulePath, `${moduleNameLower}.repository.ts`), repositoryContent);

// 4. Module
const moduleContent = `import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ${moduleName}Controller } from './${moduleNameLower}.controller';
import { ${moduleName}Service } from './${moduleNameLower}.service';
import { ${moduleName}Repository } from './${moduleNameLower}.repository';
import { ${moduleName}ResponseMapper } from './mappers/${moduleNameLower}-response.mapper';
// TODO: Import your model here
// import { ${moduleName} } from '../../database/models/${moduleNameLower}.model';

@Module({
  imports: [
    // TODO: Register your model here
    // SequelizeModule.forFeature([${moduleName}]),
  ],
  controllers: [${moduleName}Controller],
  providers: [${moduleName}Service, ${moduleName}Repository, ${moduleName}ResponseMapper],
  exports: [${moduleName}Service],
})
export class ${moduleName}Module {}
`;

writeFile(path.join(modulePath, `${moduleNameLower}.module.ts`), moduleContent);

// 5. DTOs
const createDtoContent = `import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Create${moduleName}Dto {
  @ApiProperty({ example: 'Example Name', description: 'Name of the ${moduleNameLower}' })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  // TODO: Add more fields as needed
}
`;

writeFile(path.join(modulePath, 'dto', `create-${moduleNameLower}.dto.ts`), createDtoContent);

const updateDtoContent = `import { PartialType } from '@nestjs/swagger';
import { Create${moduleName}Dto } from './create-${moduleNameLower}.dto';

export class Update${moduleName}Dto extends PartialType(Create${moduleName}Dto) {}
`;

writeFile(path.join(modulePath, 'dto', `update-${moduleNameLower}.dto.ts`), updateDtoContent);

// 6. Mapper
const mapperContent = `import { Injectable } from '@nestjs/common';
import { BaseResponseMapper } from '@common/mappers/base-response-mapper';

/**
 * ${moduleName}ResponseMapper
 *
 * Maps ${moduleNameLower}-related domain entities/DTOs to API response format.
 */
@Injectable()
export class ${moduleName}ResponseMapper extends BaseResponseMapper<any, any> {
  /**
   * Transform domain entity to API response format
   */
  toResponse(domain: any): any {
    return {
      success: true,
      data: domain,
    };
  }

  /**
   * Override if CREATE needs different format
   */
  toCreateResponse(domain: any): any {
    return {
      success: true,
      message: '${moduleName} created successfully',
      data: domain,
    };
  }

  /**
   * Override if READ needs different format
   */
  toReadResponse(domain: any): any {
    return {
      success: true,
      data: domain,
    };
  }

  /**
   * Override if UPDATE needs different format
   */
  toUpdateResponse(domain: any): any {
    return {
      success: true,
      message: '${moduleName} updated successfully',
      data: domain,
    };
  }
}
`;

writeFile(path.join(modulePath, 'mappers', `${moduleNameLower}-response.mapper.ts`), mapperContent);

// Summary
console.log('\n✅ Module generation complete!');
console.log(`\n📁 Module created at: src/modules/${moduleNameLower}/`);
console.log('\n📝 Next steps:');
console.log(`1. Create your model: src/database/models/${moduleNameLower}.model.ts`);
console.log(`2. Create migration: npm run db:migrate:create -- create-${moduleNameLower}s`);
console.log(`3. Update ${moduleNameLower}.repository.ts to import and inject your model`);
console.log(`4. Update ${moduleNameLower}.module.ts to register your model`);
console.log(`5. Import ${moduleName}Module in app.module.ts`);
console.log('\n💡 Tip: The repository extends BaseRepository with common CRUD operations!');

