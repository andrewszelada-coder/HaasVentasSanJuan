export class Order {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly branchId: string,
    public status: 'pendiente' | 'aprobado' | 'cancelado',
    public readonly deliveryDate: Date,
    public readonly observations: string | null,
    public readonly items: OrderDetail[],
    public totalAmount: number,
    public totalWeightKg: number,
    public readonly createdAt: Date
  ) {}

  public validate(): void {
    if (this.deliveryDate.getTime() < new Date().getTime()) {
      throw new Error('La fecha de entrega de la reserva debe ser posterior a la fecha actual.');
    }
    if (this.items.length === 0) {
      throw new Error('La reserva debe contener al menos un combo promocional.');
    }
    this.calculateTotals();
  }

  private calculateTotals(): void {
    this.totalAmount = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    this.totalWeightKg = this.items.reduce((sum, item) => sum + item.weightGrams / 1000, 0);
  }

  public approve(): void {
    if (this.status !== 'pendiente') {
      throw new Error(`No se puede aprobar una reserva en estado ${this.status}`);
    }
    this.status = 'aprobado';
  }
}

export class OrderDetail {
  constructor(
    public readonly promotionId: string,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly subtotal: number,
    public readonly weightGrams: number
  ) {}
}
