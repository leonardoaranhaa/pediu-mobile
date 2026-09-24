import 'dart:async';
import 'dart:convert';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';

import '../domain/pricing.dart';
import '../models/models.dart';
import '../services/api_client.dart';
import '../services/storage.dart';
import 'config.dart';

class AppState extends ChangeNotifier {
  AppState({ApiClient? api}) : api = api ?? ApiClient();

  final ApiClient api;
  final SessionStorage storage = const SessionStorage();
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;

  User? user;
  List<Product> products = [];
  List<Order> orders = [];
  List<Address> addresses = [];
  List<CartLine> cart = [];
  Quote? quoteResult;
  PixCharge? lastPixCharge;
  String? _checkoutIdempotencyKey;
  bool loading = false;
  String? error;

  bool get isAuthenticated => user != null;
  int get cartCount => cart.fold(0, (total, line) => total + line.quantity);
  double get cartSubtotal => pricing.cartSubtotal(cart);
  Product? get firstCartProduct => cart.isEmpty ? null : cart.first.product;

  Future<void> init() async {
    final cachedUser = await storage.readUser();
    final rawCart = await storage.readCart();
    cart = rawCart.map(_cartLineFromJson).whereType<CartLine>().toList();
    user = cachedUser;
    if (!kIsWeb) {
      _linkSubscription = _appLinks.uriLinkStream.listen(handleOAuthUri);
      try {
        final initial = await _appLinks.getInitialLink();
        if (initial != null) await handleOAuthUri(initial);
      } catch (_) {
        // A missing initial deep link is normal on cold start.
      }
    }
    await refreshSession();
    notifyListeners();
  }

  Future<void> refreshSession() async {
    try {
      final nextUser = await api.me();
      if (nextUser != null) {
        user = nextUser;
        await storage.writeSession(await storage.readToken() ?? '', nextUser);
      }
    } catch (_) {
      // Cached mobile identity remains visible until an authenticated call fails.
    }
  }

  Future<void> loadProducts({String? category, String? search}) async {
    await _run(() async {
      products = search != null && search.trim().isNotEmpty
          ? await api.search(search.trim())
          : await api.products(category: category);
    });
  }

  Future<void> loadOrders() async {
    if (!isAuthenticated) return;
    await _run(() async => orders = await api.orders());
  }

  Future<void> loadAddresses() async {
    if (!isAuthenticated) return;
    await _run(() async => addresses = await api.addresses());
  }

  void addToCart(Product product) {
    if (cart.isNotEmpty && cart.first.product.storeId != product.storeId) {
      throw StateError('O carrinho aceita produtos de uma loja por vez.');
    }
    final index = cart.indexWhere((line) => line.product.id == product.id);
    if (index == -1) {
      cart = [...cart, CartLine(product: product)];
    } else {
      final line = cart[index];
      cart = [...cart]..[index] = line.copyWith(quantity: line.quantity + 1);
    }
    unawaited(_persistCart());
    notifyListeners();
  }

  void removeOne(Product product) {
    final index = cart.indexWhere((line) => line.product.id == product.id);
    if (index == -1) return;
    final line = cart[index];
    if (line.quantity <= 1) {
      cart = [...cart]..removeAt(index);
    } else {
      cart = [...cart]..[index] = line.copyWith(quantity: line.quantity - 1);
    }
    unawaited(_persistCart());
    notifyListeners();
  }

  void clearCart() {
    cart = [];
    quoteResult = null;
    _checkoutIdempotencyKey = null;
    unawaited(_persistCart());
    notifyListeners();
  }

  Future<void> fetchQuote({String? couponCode}) async {
    final product = firstCartProduct;
    if (product == null) throw const ApiException('Seu carrinho está vazio');
    quoteResult = await api.quote(
      storeId: product.storeId,
      couponCode: couponCode,
      items: cart
          .map((line) => {
                'productId': line.product.id,
                'quantity': line.quantity,
                if (line.note?.isNotEmpty == true) 'note': line.note,
              })
          .toList(),
    );
    notifyListeners();
  }

  Future<Map<String, dynamic>> checkout({
    required String deliveryAddress,
    int? addressId,
    required String paymentMethod,
    String? couponCode,
  }) async {
    if (!isAuthenticated) {
      throw const ApiException('Entre para finalizar o pedido');
    }
    final quote = quoteResult ?? await _quoteForCheckout(couponCode);
    final product = firstCartProduct!;
    _checkoutIdempotencyKey ??=
        'flutter-${DateTime.now().toUtc().millisecondsSinceEpoch}-${product.storeId}';
    lastPixCharge = null;
    final result = await api.createOrder(input: {
      'idempotencyKey': _checkoutIdempotencyKey,
      'storeId': product.storeId,
      'total': quote.total.toStringAsFixed(2),
      'paymentMethod': paymentMethod,
      if (addressId != null) 'addressId': addressId,
      if (addressId == null) 'deliveryAddress': deliveryAddress.trim(),
      if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
      'items': cart
          .map((line) => {
                'productId': line.product.id,
                'quantity': line.quantity,
                'unitPrice': line.product.price.toStringAsFixed(2),
                if (line.note?.isNotEmpty == true) 'note': line.note,
              })
          .toList(),
    });
    final orderId = int.tryParse('${result['orderId']}');
    if (paymentMethod == 'pix' && orderId != null) {
      lastPixCharge = await api.createPix(orderId);
    }
    clearCart();
    await loadOrders();
    return result;
  }

  Future<Quote> _quoteForCheckout(String? couponCode) async {
    await fetchQuote(couponCode: couponCode);
    return quoteResult!;
  }

  Future<void> startLogin() async {
    if (!AppConfig.oauthConfigured) {
      throw const ApiException(
          'Configure PEDIU_OAUTH_PORTAL_URL e PEDIU_APP_ID para entrar');
    }
    final state = base64Encode(utf8.encode(AppConfig.redirectUri));
    final uri = Uri.parse(AppConfig.oauthPortalUrl).replace(queryParameters: {
      'appId': AppConfig.appId,
      'redirectUri': AppConfig.redirectUri,
      'state': state,
      'type': 'signIn',
    });
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      throw const ApiException('Não foi possível abrir o login seguro');
    }
  }

  Future<void> handleOAuthUri(Uri uri) async {
    if (uri.scheme != 'pediu' || uri.host != 'oauth') return;
    final code = uri.queryParameters['code'];
    final state = uri.queryParameters['state'];
    if (code == null || state == null) return;
    await _run(() async {
      final response = await api.exchangeMobileOAuth(uri);
      final token = response['app_session_id'] as String?;
      final rawUser = response['user'];
      if (token == null || rawUser is! Map) {
        throw const ApiException('Resposta de login inválida');
      }
      user = User.fromJson(Map<String, dynamic>.from(rawUser));
      await storage.writeSession(token, user!);
      await loadAddresses();
      await loadOrders();
    });
  }

  Future<void> logout() async {
    await api.logout();
    user = null;
    addresses = [];
    orders = [];
    quoteResult = null;
    notifyListeners();
  }

  Future<void> _run(Future<void> Function() action) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      await action();
    } catch (exception) {
      error = exception is ApiException
          ? exception.message
          : 'Não foi possível concluir a operação';
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> _persistCart() async {
    await storage.writeCart(cart.map(_cartLineToJson).toList());
  }

  Map<String, dynamic> _cartLineToJson(CartLine line) => {
        'product': {
          'id': line.product.id,
          'storeId': line.product.storeId,
          'name': line.product.name,
          'category': line.product.category,
          'description': line.product.description,
          'price': line.product.price,
          'available': line.product.available,
          'storeName': line.product.storeName,
          'deliveryFee': line.product.deliveryFee,
        },
        'quantity': line.quantity,
        'note': line.note,
      };

  CartLine? _cartLineFromJson(Map<String, dynamic> json) {
    final rawProduct = json['product'];
    if (rawProduct is! Map) return null;
    return CartLine(
      product: Product.fromJson(Map<String, dynamic>.from(rawProduct)),
      quantity: int.tryParse('${json['quantity']}') ?? 1,
      note: json['note'] as String?,
    );
  }

  @override
  void dispose() {
    unawaited(_linkSubscription?.cancel());
    super.dispose();
  }
}

// Alias local para deixar as regras de preço legíveis no estado.
final pricing = _PricingFacade();

class _PricingFacade {
  double cartSubtotal(Iterable<CartLine> lines) =>
      lines.fold(0, (total, line) => total + line.lineTotal);
}
