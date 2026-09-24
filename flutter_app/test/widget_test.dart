import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';

import 'package:pediu_flutter/core/app_state.dart';
import 'package:pediu_flutter/models/models.dart';
import 'package:pediu_flutter/ui/screens/product_detail_screen.dart';

void main() {
  testWidgets('exibe detalhe e permite adicionar produto ao pedido',
      (tester) async {
    const product = Product(
      id: 101,
      storeId: 7,
      name: 'Produto E2E',
      category: 'Geral',
      description: 'Produto de teste',
      price: 18,
      available: true,
      storeName: 'Loja E2E',
      deliveryFee: 5,
    );
    final state = AppState();

    await tester.pumpWidget(
      MaterialApp(home: ProductDetailScreen(state: state, product: product)),
    );

    expect(find.text('Produto E2E'), findsOneWidget);
    expect(find.text('Adicionar ao pedido'), findsOneWidget);
    await tester.tap(find.text('Adicionar ao pedido'));
    await tester.pump();
    expect(state.cartCount, 1);
  });
}
