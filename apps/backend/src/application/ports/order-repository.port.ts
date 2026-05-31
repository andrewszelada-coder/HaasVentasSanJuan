import { Order } from '../../domain/entities/order.entity';

export interface OrderRepositoryPort {
  save(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findPromotionById(id: string): Promise<{
    id: string;
    titulo: string;
    precio_bs: number;
    stock_disponible: number;
    activo: boolean;
    products: { weight: number }[];
  } | null>;
  updateStock(promotionId: string, quantity: number): Promise<void>;
}
