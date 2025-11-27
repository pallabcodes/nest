import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UploadedFiles,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUserQueryDto } from './dto/find-all-user-query.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { FileStorageService } from './file-storage.service';

@ApiTags('User')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Register a new user account. User will need to verify email with OTP.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully. Check response for OTP in development.',
    schema: {
      example: {
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: 1,
            email: 'user@example.com',
            name: 'John Doe',
            isEmailVerified: false,
          },
          otp: {
            code: '123456',
            expiresAt: '2024-01-15T10:30:00.000Z',
          },
        },
      },
    },
  })
  async create(@Body(ValidationPipe) createDto: CreateUserDto) {
    return this.userService.create(createDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(@Query() query: FindAllUserQueryDto) {
    return this.userService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }

  // ============================================
  // FILE UPLOAD ENDPOINTS
  // ============================================

  @Post('avatar')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload current user avatar - Authenticated users only' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  async uploadAvatar(
    @CurrentUser() currentUser: { id: number; email?: string; name?: string; roles?: string[] },
    @UploadedFile() file: any,
  ) {
    return this.userService.updateAvatar(currentUser.id, file);
  }

  @Post('files')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple files - Authenticated users only' })
  @ApiResponse({ status: 200, description: 'Files uploaded successfully' })
  async uploadFiles(@UploadedFiles() files: any[]) {
    return this.userService.uploadFiles(files);
  }

  // Backward compatibility: Keep old /users/upload endpoint
  @Post('upload')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[DEPRECATED] Upload multiple files - Use /users/files instead' })
  @ApiResponse({ status: 200, description: 'Files uploaded successfully' })
  async uploadFilesLegacy(@UploadedFiles() files: any[]) {
    return this.userService.uploadFilesLegacy(files);
  }
}
