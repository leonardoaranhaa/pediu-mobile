import 'package:flutter/material.dart';

import '../../core/app_state.dart';
import '../widgets/money.dart';
import 'checkout_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({required this.state, super.key});

  final AppState state;

  @override
  Widget build(BuildContext context) {
    final deliveryFee = state.firstCartProduct?.deliveryFee ?? 0;
    return Scaffold(
      appBar: AppBar(title: const Text('Seu carrinho')),
      body: state.cart.isEmpty
          ? const Center(child: Text('Seu carrinho está vazio.'))
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
              children: [
                Text('${state.cartCount} item(ns)',
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 10),
                ...state.cart.map((line) => Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            const Icon(Icons.fastfood_outlined, size: 28),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(line.product.name,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w800)),
                                  Text('${brl(line.product.price)} cada'),
                                  Text(brl(line.lineTotal),
                                      style: TextStyle(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .primary,
                                          fontWeight: FontWeight.w800)),
                                ],
                              ),
                            ),
                            IconButton(
                                onPressed: () => state.removeOne(line.product),
                                icon: const Icon(Icons.remove_circle_outline)),
                            Text('${line.quantity}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w800)),
                            IconButton(
                                onPressed: () => state.addToCart(line.product),
                                icon: const Icon(Icons.add_circle_outline)),
                          ],
                        ),
                      ),
                    )),
                const SizedBox(height: 18),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      children: [
                        _SummaryRow(
                            label: 'Subtotal', value: brl(state.cartSubtotal)),
                        _SummaryRow(label: 'Entrega', value: brl(deliveryFee)),
                        const Divider(height: 24),
                        _SummaryRow(
                            label: 'Total estimado',
                            value: brl(state.cartSubtotal + deliveryFee),
                            emphasized: true),
                        const SizedBox(height: 8),
                        Text(
                            'O total final será recalculado pelo servidor no checkout.',
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => CheckoutScreen(state: state))),
                  icon: const Icon(Icons.arrow_forward),
                  label: const Text('Continuar para checkout'),
                ),
                TextButton(
                    onPressed: state.clearCart,
                    child: const Text('Limpar carrinho')),
              ],
            ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow(
      {required this.label, required this.value, this.emphasized = false});

  final String label;
  final String value;
  final bool emphasized;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: emphasized
                  ? const TextStyle(fontWeight: FontWeight.w900)
                  : null),
          Text(value,
              style: TextStyle(
                  fontWeight: emphasized ? FontWeight.w900 : FontWeight.w600,
                  fontSize: emphasized ? 18 : null)),
        ],
      );
}
