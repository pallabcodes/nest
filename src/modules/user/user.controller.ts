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
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUserQueryDto } from './dto/find-all-user-query.dto';
import { UserResponseMapper } from './mappers/user-response.mapper';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { FileStorageService } from './file-storage.service';
import * as multer from 'multer';

@ApiTags('User')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly responseMapper: UserResponseMapper,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Body() createDto: CreateUserDto) {
    const result = await this.userService.create(createDto);
    return this.responseMapper.toCreateResponse(result);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(@Query() query: FindAllUserQueryDto) {
    const result = await this.userService.findAll(query);
    const paginated = this.responseMapper.toPaginatedResponse(
      result.data,
      result.page,
      result.limit,
      result.total,
    );
    return {
      success: true,
      data: paginated,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.userService.findOne(id);
    return this.responseMapper.toReadResponse(result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateUserDto) {
    const result = await this.userService.update(id, updateDto);
    return this.responseMapper.toUpdateResponse(result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.userService.remove(id);
    return this.responseMapper.toDeleteResponse(id);
  }

  // ============================================
  // FILE UPLOAD ENDPOINTS
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.diskStorage({
        destination: '/tmp',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (jpeg, jpg, png, webp, max 5MB)',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload current user avatar - Authenticated users only' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async uploadAvatar(
    @CurrentUser() currentUser: { id: number; email?: string; name?: string; roles?: string[] },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const filePath = await this.fileStorageService.saveFile(file, 'avatars');
    const user = await this.userService.updateAvatar(currentUser.id, filePath);

    return {
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        user: this.responseMapper.toResponse(user),
        avatarPath: filePath,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('files')
  @ApiBearerAuth()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multer.diskStorage({
        destination: '/tmp',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Multiple image files (jpeg, jpg, png, webp, max 5MB each)',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload multiple files - Authenticated users only' })
  @ApiResponse({ status: 200, description: 'Files uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const filePaths = await this.fileStorageService.saveFiles(files, 'files');

    return {
      success: true,
      message: `${filePaths.length} file(s) uploaded successfully`,
      data: {
        files: filePaths.map((path, index) => ({
          originalName: files[index].originalname,
          path,
          size: files[index].size,
        })),
      },
    };
  }

  // Backward compatibility: Keep old /users/upload endpoint
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @ApiBearerAuth()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multer.diskStorage({
        destination: '/tmp',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Multiple image files (jpeg, jpg, png, webp, max 5MB each) - DEPRECATED: Use /users/files instead',
        },
      },
    },
  })
  @ApiOperation({ summary: '[DEPRECATED] Upload multiple files - Use /users/files instead' })
  @ApiResponse({ status: 200, description: 'Files uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFilesLegacy(@UploadedFiles() files: Express.Multer.File[]) {
    // Reuse the same logic as uploadFiles
    return this.uploadFiles(files);
  }
}
