import 'package:flutter/material.dart';

import '../../core/app_state.dart';
import '../../models/models.dart';
import '../widgets/money.dart';

class ProductDetailScreen extends StatelessWidget {
  const ProductDetailScreen(
      {required this.state, required this.product, super.key});

  final AppState state;
  final Product product;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Detalhe do produto')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              height: 220,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.secondaryContainer,
                borderRadius: BorderRadius.circular(28),
              ),
              child: const Icon(Icons.fastfood, size: 90),
            ),
            const SizedBox(height: 22),
            Text(product.storeName.toUpperCase(),
                style: Theme.of(context)
                    .textTheme
                    .labelLarge
                    ?.copyWith(letterSpacing: 1.2)),
            const SizedBox(height: 8),
            Text(product.name,
                style:
                    const TextStyle(fontSize: 30, fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            Text(
                product.description.isEmpty
                    ? 'Uma opção feita com carinho por quem vende perto de você.'
                    : product.description,
                style: const TextStyle(height: 1.45)),
            const SizedBox(height: 22),
            Text('Preço', style: Theme.of(context).textTheme.labelLarge),
            Text(brl(product.price),
                style: TextStyle(
                    fontSize: 24,
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: () {
                try {
                  state.addToCart(product);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Adicionado ao seu pedido')));
                } on StateError catch (error) {
                  ScaffoldMessenger.of(context)
                      .showSnackBar(SnackBar(content: Text(error.message)));
                }
              },
              icon: const Icon(Icons.add_shopping_cart),
              label: const Text('Adicionar ao pedido'),
            ),
          ],
        ),
      );
}
