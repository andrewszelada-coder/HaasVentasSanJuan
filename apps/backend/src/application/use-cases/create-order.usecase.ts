import { Order, OrderDetail } from '../../domain/entities/order.entity';
import { OrderRepositoryPort } from '../ports/order-repository.port';

export interface CreateOrderInput {
  userId: string;
  branchId: string;
  deliveryDate: Date;
  observations: string | null;
  items: { promotionId: string; quantity: number }[];
}

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepositoryPort
  ) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    const detailEntities: OrderDetail[] = [];

    for (const item of input.items) {
      // 1. Obtener detalles de la promoción del catálogo
      const promo = await this.orderRepository.findPromotionById(item.promotionId);
      if (!promo || !promo.activo) {
        throw new Error(`La promoción ${item.promotionId} no está disponible.`);
      }

      // Validación de tipo de venta y formato de cantidad
      if (promo.tipo_venta === 'A granel (Kg)') {
        if (typeof item.quantity !== 'number' || isNaN(item.quantity) || item.quantity <= 0) {
          throw new Error(`La cantidad para "${promo.titulo}" debe ser un número decimal positivo.`);
        }
      } else {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new Error(`La cantidad para "${promo.titulo}" debe ser un número entero positivo.`);
        }
      }

      // Validación de stock (Condición Crítica QA)
      if (item.quantity > promo.stock_disponible) {
        throw new Error(`Stock insuficiente para "${promo.titulo}". Solicitado: ${item.quantity}, Disponible: ${promo.stock_disponible}`);
      }

      // 2. Crear el desglose del detalle calculando subtotales
      const subtotal = Number(promo.precio_bs) * item.quantity;
      const totalWeight = promo.products.reduce((w, p) => w + p.weight * item.quantity, 0);

      detailEntities.push(
        new OrderDetail(
          item.promotionId,
          item.quantity,
          Number(promo.precio_bs),
          subtotal,
          totalWeight
        )
      );
    }

    // 3. Crear entidad y validar reglas del dominio
    const newOrder = new Order(
      '', // ID autogenerado
      input.userId,
      input.branchId,
      'pendiente',
      input.deliveryDate,
      input.observations,
      detailEntities,
      0,
      0,
      new Date()
    );
    newOrder.validate();

    // 4. Guardar en Base de Datos de manera transaccional a través del adaptador
    const savedOrder = await this.orderRepository.save(newOrder);

    // 5. Restar stock atómicamente al confirmarse
    for (const item of input.items) {
      await this.orderRepository.updateStock(item.promotionId, item.quantity);
    }

    return savedOrder;
  }
}
