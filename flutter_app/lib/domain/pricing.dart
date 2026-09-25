import '../models/models.dart';

class CartLine {
  const CartLine({required this.product, this.quantity = 1, this.note});

  final Product product;
  final int quantity;
  final String? note;

  CartLine copyWith({int? quantity, String? note}) => CartLine(
        product: product,
        quantity: quantity ?? this.quantity,
        note: note ?? this.note,
      );

  double get lineTotal => product.price * quantity;
}

double cartSubtotal(Iterable<CartLine> lines) =>
    lines.fold(0, (total, line) => total + line.lineTotal);

double estimatedTotal(Iterable<CartLine> lines, double deliveryFee) =>
    cartSubtotal(lines) + deliveryFee;
