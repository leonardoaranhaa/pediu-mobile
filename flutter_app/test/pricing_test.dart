import 'package:flutter_test/flutter_test.dart';

import 'package:pediu_flutter/domain/pricing.dart';
import 'package:pediu_flutter/models/models.dart';

void main() {
  const product = Product(
    id: 101,
    storeId: 7,
    name: 'Produto E2E',
    category: 'Geral',
    description: '',
    price: 18,
    available: true,
    storeName: 'Loja E2E',
    deliveryFee: 5,
  );

  test('calcula subtotal pela quantidade de itens', () {
    final lines = [const CartLine(product: product, quantity: 3)];
    expect(cartSubtotal(lines), 54);
  });

  test('calcula total estimado com entrega', () {
    final lines = [const CartLine(product: product)];
    expect(estimatedTotal(lines, 5), 23);
  });

  test('impede quantidade abaixo de um por linha nova', () {
    const line = CartLine(product: product);
    expect(line.quantity, 1);
    expect(line.lineTotal, 18);
  });
}
