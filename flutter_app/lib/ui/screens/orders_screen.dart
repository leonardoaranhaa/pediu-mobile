import 'package:flutter/material.dart';

import '../../core/app_state.dart';
import '../../models/models.dart';
import '../widgets/money.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({required this.state, super.key});

  final AppState state;

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.state.isAuthenticated) {
      widget.state.loadOrders().catchError((_) {});
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Meus pedidos')),
        body: !widget.state.isAuthenticated
            ? _loginRequired(context)
            : RefreshIndicator(
                onRefresh: widget.state.loadOrders,
                child: widget.state.orders.isEmpty
                    ? ListView(children: const [
                        SizedBox(height: 180),
                        Center(child: Text('Você ainda não tem pedidos.'))
                      ])
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
                        itemCount: widget.state.orders.length,
                        itemBuilder: (context, index) =>
                            _OrderCard(order: widget.state.orders[index]),
                      ),
              ),
      );

  Widget _loginRequired(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock_outline, size: 48),
              const SizedBox(height: 14),
              const Text('Entre para consultar seus pedidos',
                  style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
                  textAlign: TextAlign.center),
              const SizedBox(height: 8),
              const Text(
                  'Sua conta precisa estar sincronizada para carregar o histórico real.',
                  textAlign: TextAlign.center),
              const SizedBox(height: 18),
              FilledButton(
                  onPressed: () => widget.state.startLogin().catchError((_) {}),
                  child: const Text('Entrar com login seguro')),
            ],
          ),
        ),
      );
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor:
                    Theme.of(context).colorScheme.secondaryContainer,
                child: const Icon(Icons.receipt_long_outlined),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Pedido #${order.id}',
                        style: const TextStyle(fontWeight: FontWeight.w900)),
                    const SizedBox(height: 5),
                    Text(order.status),
                    if (order.deliveryAddress.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(order.deliveryAddress,
                          maxLines: 2, overflow: TextOverflow.ellipsis),
                    ],
                  ],
                ),
              ),
              Text(brl(order.total),
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.w900)),
            ],
          ),
        ),
      );
}
