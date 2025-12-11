import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CheckoutResponseDto } from './dto/checkout-response.dto';
import { ListPaymentsDto, ListPaymentsQueryDto, PaymentSummaryDto } from './dto/payment.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@shared-types/auth';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async createCheckoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CheckoutResponseDto> {
    return this.paymentsService.createCheckoutSessionForOrder(user.id, dto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPaymentById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PaymentSummaryDto> {
    const payment = await this.paymentsService.getPaymentForUser(id, user.id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listMyPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPaymentsQueryDto,
  ): Promise<ListPaymentsDto> {
    return this.paymentsService.listPaymentsForUser(user.id, query);
  }
}

