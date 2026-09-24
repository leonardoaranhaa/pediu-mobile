import 'package:flutter/material.dart';

import '../../core/app_state.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({required this.state, super.key});

  final AppState state;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Perfil')),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
          children: [
            _identityCard(context),
            const SizedBox(height: 12),
            Card(
              child: Column(
                children: [
                  ListTile(
                      leading: const Icon(Icons.location_on_outlined),
                      title: const Text('Endereços'),
                      subtitle: Text(state.isAuthenticated
                          ? 'Gerenciados no checkout'
                          : 'Entre para sincronizar'),
                      onTap: state.isAuthenticated
                          ? () => _loadAddresses(context)
                          : null),
                  const Divider(height: 1),
                  ListTile(
                      leading: const Icon(Icons.receipt_long_outlined),
                      title: const Text('Pedidos'),
                      subtitle: const Text('Histórico persistente'),
                      onTap: state.isAuthenticated
                          ? () => _showOrdersHint(context)
                          : null),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _identityCard(BuildContext context) {
    final current = state.user;
    return Card(
      color: Theme.of(context).colorScheme.primary,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: current == null
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Visitante',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  const Text(
                      'Entre para sincronizar seus pedidos em qualquer dispositivo.',
                      style: TextStyle(color: Colors.white70)),
                  const SizedBox(height: 18),
                  FilledButton.tonal(
                      onPressed: () => state.startLogin().catchError((_) {}),
                      child: const Text('Entrar com login seguro')),
                ],
              )
            : Row(
                children: [
                  const CircleAvatar(radius: 28, child: Icon(Icons.person)),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(current.name ?? 'Cliente Pediu',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 21,
                                fontWeight: FontWeight.w900)),
                        Text(current.email ?? current.role,
                            style: const TextStyle(color: Colors.white70)),
                      ],
                    ),
                  ),
                  IconButton(
                      onPressed: () => state.logout().catchError((_) {}),
                      color: Colors.white,
                      tooltip: 'Sair',
                      icon: const Icon(Icons.logout)),
                ],
              ),
      ),
    );
  }

  Future<void> _loadAddresses(BuildContext context) async {
    try {
      await state.loadAddresses();
      if (!context.mounted) return;
      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Endereços'),
          content: SizedBox(
            width: double.maxFinite,
            child: state.addresses.isEmpty
                ? const Text('Nenhum endereço salvo.')
                : ListView(
                    shrinkWrap: true,
                    children: state.addresses
                        .map((address) => ListTile(
                            title: Text(address.label),
                            subtitle: Text(address.formatted)))
                        .toList()),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Fechar'))
          ],
        ),
      );
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    }
  }

  void _showOrdersHint(BuildContext context) =>
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Abra a aba Pedidos para consultar o histórico.')));
}
