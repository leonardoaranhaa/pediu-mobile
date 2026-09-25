import 'package:flutter/material.dart';

import '../../core/app_state.dart';
import '../../models/models.dart';
import '../widgets/money.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({required this.state, super.key});

  final AppState state;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final addressController = TextEditingController();
  final couponController = TextEditingController();
  String paymentMethod = 'pix';
  Address? selectedAddress;

  @override
  void initState() {
    super.initState();
    if (widget.state.isAuthenticated) {
      widget.state.loadAddresses().then((_) {
        if (!mounted) return;
        setState(() {
          selectedAddress = widget.state.addresses
                  .where((address) => address.isDefault)
                  .firstOrNull ??
              widget.state.addresses.firstOrNull;
        });
      }).catchError((_) {});
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.state.isAuthenticated) return _loginRequired(context);
    final quote = widget.state.quoteResult;
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
        children: [
          if (widget.state.error != null)
            _errorCard(context, widget.state.error!),
          const Text('Endereço de entrega',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          if (widget.state.addresses.isNotEmpty)
            DropdownButtonFormField<Address>(
              initialValue: selectedAddress,
              decoration:
                  const InputDecoration(labelText: 'Escolha um endereço salvo'),
              items: widget.state.addresses
                  .map((address) => DropdownMenuItem(
                      value: address,
                      child: Text(
                          '${address.label} · ${address.street}, ${address.number}')))
                  .toList(),
              onChanged: (value) => setState(() => selectedAddress = value),
            ),
          const SizedBox(height: 10),
          TextField(
            controller: addressController,
            maxLines: 2,
            decoration: InputDecoration(
              labelText: selectedAddress == null
                  ? 'Endereço de entrega'
                  : 'Ou informe outro endereço',
              hintText: 'Rua, número, bairro, cidade/UF',
            ),
          ),
          const SizedBox(height: 24),
          const Text('Forma de pagamento',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                  label: const Text('PIX'),
                  selected: paymentMethod == 'pix',
                  onSelected: (_) => setState(() => paymentMethod = 'pix')),
              ChoiceChip(
                  label: const Text('Dinheiro'),
                  selected: paymentMethod == 'cash',
                  onSelected: (_) => setState(() => paymentMethod = 'cash')),
            ],
          ),
          const SizedBox(height: 24),
          TextField(
              controller: couponController,
              decoration: const InputDecoration(labelText: 'Cupom (opcional)')),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: widget.state.loading ? null : () => _quote(),
            icon: const Icon(Icons.calculate_outlined),
            label: Text(quote == null
                ? 'Calcular total no servidor'
                : 'Atualizar cotação'),
          ),
          if (quote != null) ...[
            const SizedBox(height: 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  children: [
                    _row('Subtotal', brl(quote.subtotal)),
                    _row('Entrega', brl(quote.deliveryFee)),
                    if (quote.discount > 0)
                      _row('Desconto', '- ${brl(quote.discount)}'),
                    const Divider(height: 24),
                    _row('Total', brl(quote.total), strong: true),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: widget.state.loading ? null : () => _submit(),
            icon: widget.state.loading
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.check_circle_outline),
            label: const Text('Enviar pedido'),
          ),
        ],
      ),
    );
  }

  Widget _loginRequired(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_outline, size: 48),
                const SizedBox(height: 14),
                const Text('Entre para continuar',
                    style:
                        TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                const Text(
                    'Sua sessão é necessária para criar um pedido e acompanhar o pagamento.',
                    textAlign: TextAlign.center),
                const SizedBox(height: 18),
                FilledButton(
                    onPressed: () => _login(context),
                    child: const Text('Entrar com login seguro')),
              ],
            ),
          ),
        ),
      );

  Future<void> _quote() async {
    try {
      await widget.state.fetchQuote(couponCode: couponController.text.trim());
    } catch (error) {
      if (mounted) _showError(error.toString());
    }
  }

  Future<void> _submit() async {
    if (widget.state.quoteResult == null) {
      await _quote();
      if (!mounted || widget.state.quoteResult == null) return;
    }
    if (selectedAddress == null && addressController.text.trim().isEmpty) {
      _showError('Informe ou selecione um endereço de entrega');
      return;
    }
    try {
      final result = await widget.state.checkout(
        addressId: selectedAddress?.id,
        deliveryAddress: addressController.text,
        paymentMethod: paymentMethod,
        couponCode: couponController.text.trim(),
      );
      if (!mounted) return;
      final orderId = result['orderId'];
      final pix = widget.state.lastPixCharge;
      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Pedido enviado'),
          content: Text(pix == null
              ? 'Pedido #$orderId recebido.'
              : 'Pedido #$orderId recebido. PIX: ${pix.status}.'),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Ok'))
          ],
        ),
      );
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (mounted) _showError(error.toString());
    }
  }

  Future<void> _login(BuildContext context) async {
    try {
      await widget.state.startLogin();
    } catch (error) {
      _showError(error.toString());
    }
  }

  Widget _errorCard(BuildContext context, String message) => Card(
        color: Theme.of(context).colorScheme.errorContainer,
        child: Padding(padding: const EdgeInsets.all(12), child: Text(message)),
      );

  Widget _row(String label, String value, {bool strong = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child:
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(label,
              style: TextStyle(fontWeight: strong ? FontWeight.w900 : null)),
          Text(value,
              style: TextStyle(
                  fontWeight: strong ? FontWeight.w900 : null,
                  fontSize: strong ? 18 : null))
        ]),
      );

  void _showError(String message) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(message)));

  @override
  void dispose() {
    addressController.dispose();
    couponController.dispose();
    super.dispose();
  }
}
