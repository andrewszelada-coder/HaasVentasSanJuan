import { Controller, Post, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.usecase';

interface CreateOrderDto {
  userId: string;
  branchId: string;
  deliveryDate: string;
  observations: string | null;
  items: { promotionId: string; quantity: number }[];
}

@Controller('orders')
export class OrderController {
  constructor(private readonly createOrderUseCase: CreateOrderUseCase) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    try {
      const result = await this.createOrderUseCase.execute({
        userId: createOrderDto.userId,
        branchId: createOrderDto.branchId,
        deliveryDate: new Date(createOrderDto.deliveryDate),
        observations: createOrderDto.observations,
        items: createOrderDto.items.map(item => ({
          promotionId: item.promotionId,
          quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : Number(item.quantity),
        })),
      });

      return {
        success: true,
        orderId: result.id,
        status: result.status,
        totalAmount: result.totalAmount,
        totalWeightKg: result.totalWeightKg,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Error al procesar la reserva.',
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
