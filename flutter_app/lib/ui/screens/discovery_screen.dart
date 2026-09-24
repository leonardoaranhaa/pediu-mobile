import 'package:flutter/material.dart';

import '../../core/app_state.dart';
import '../../models/models.dart';
import '../widgets/money.dart';
import 'product_detail_screen.dart';

class DiscoveryScreen extends StatefulWidget {
  const DiscoveryScreen({required this.state, super.key});

  final AppState state;

  @override
  State<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends State<DiscoveryScreen> {
  final searchController = TextEditingController();
  String category = 'Tudo';

  @override
  void initState() {
    super.initState();
    if (widget.state.products.isEmpty) {
      widget.state.loadProducts().catchError((_) {});
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Pediu',
              style: TextStyle(fontWeight: FontWeight.w900)),
          actions: [
            IconButton(
              tooltip: 'Atualizar catálogo',
              onPressed: widget.state.loading
                  ? null
                  : () => widget.state.loadProducts(category: category),
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () => widget.state.loadProducts(category: category),
          child: CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                sliver: SliverToBoxAdapter(child: _hero(context)),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 4),
                sliver: SliverToBoxAdapter(child: _searchField()),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
                sliver: SliverToBoxAdapter(child: _categories()),
              ),
              if (widget.state.error != null)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  sliver: SliverToBoxAdapter(child: _errorCard()),
                ),
              if (widget.state.loading && widget.state.products.isEmpty)
                const SliverFillRemaining(
                    child: Center(child: CircularProgressIndicator()))
              else if (widget.state.products.isEmpty)
                const SliverFillRemaining(
                    child:
                        Center(child: Text('Nenhum produto disponível agora.')))
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 110),
                  sliver: SliverList.builder(
                    itemCount: widget.state.products.length,
                    itemBuilder: (context, index) => _ProductCard(
                      product: widget.state.products[index],
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ProductDetailScreen(
                              state: widget.state,
                              product: widget.state.products[index]),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      );

  Widget _hero(BuildContext context) => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary,
          borderRadius: BorderRadius.circular(28),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('PERTO DE VOCÊ',
                style: TextStyle(
                    color: Colors.white70,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2)),
            SizedBox(height: 8),
            Text('Seu bairro, do seu jeito.',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 25,
                    fontWeight: FontWeight.w900)),
            SizedBox(height: 6),
            Text(
                'Encontre sabores, serviços e pessoas que fazem parte da sua rotina.',
                style: TextStyle(color: Colors.white70, height: 1.35)),
          ],
        ),
      );

  Widget _searchField() => TextField(
        controller: searchController,
        textInputAction: TextInputAction.search,
        onSubmitted: (value) =>
            widget.state.loadProducts(search: value).catchError((_) {}),
        decoration: InputDecoration(
          hintText: 'Buscar comida, produtos ou serviços',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: searchController.text.isEmpty
              ? null
              : IconButton(
                  onPressed: () {
                    searchController.clear();
                    setState(() {});
                    widget.state
                        .loadProducts(category: category)
                        .catchError((_) {});
                  },
                  icon: const Icon(Icons.close),
                ),
        ),
        onChanged: (_) => setState(() {}),
      );

  Widget _categories() => SizedBox(
        height: 42,
        child: ListView(
          scrollDirection: Axis.horizontal,
          children: ['Tudo', 'Doces', 'Lanches', 'Serviços']
              .map((item) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(item),
                      selected: category == item,
                      onSelected: (_) {
                        setState(() => category = item);
                        widget.state
                            .loadProducts(category: item)
                            .catchError((_) {});
                      },
                    ),
                  ))
              .toList(),
        ),
      );

  Widget _errorCard() => Card(
        color: Theme.of(context).colorScheme.errorContainer,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Text(widget.state.error!,
              style: TextStyle(
                  color: Theme.of(context).colorScheme.onErrorContainer)),
        ),
      );
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product, required this.onTap});

  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(22),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.secondaryContainer,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(Icons.fastfood_outlined, size: 30),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(product.storeName,
                          style: Theme.of(context).textTheme.labelMedium),
                      const SizedBox(height: 3),
                      Text(product.name,
                          style: const TextStyle(
                              fontSize: 17, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Text(
                          product.description.isEmpty
                              ? 'Disponível agora perto de você'
                              : product.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 8),
                      Text(brl(product.price),
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.w900)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right),
              ],
            ),
          ),
        ),
      );
}
