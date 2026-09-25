import 'dart:convert';

import 'package:http/http.dart' as http;

import '../core/config.dart';
import '../models/models.dart';
import 'storage.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client, SessionStorage? storage})
      : _client = client ?? http.Client(),
        _storage = storage ?? const SessionStorage();

  final http.Client _client;
  final SessionStorage _storage;

  Uri _trpcUri(String procedure, [Map<String, dynamic>? input]) {
    final base = AppConfig.apiBaseUrl.replaceFirst(RegExp(r'/$'), '');
    final query = input == null
        ? <String, String>{}
        : {
            'input': jsonEncode({'json': input})
          };
    return Uri.parse('$base/api/trpc/$procedure')
        .replace(queryParameters: query);
  }

  Future<Map<String, String>> _headers() async {
    final token = await _storage.readToken();
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> query(String procedure, [Map<String, dynamic>? input]) async {
    final response = await _client
        .get(_trpcUri(procedure, input), headers: await _headers())
        .timeout(const Duration(seconds: 15));
    return _decode(response);
  }

  Future<dynamic> mutation(String procedure,
      [Map<String, dynamic>? input]) async {
    final response = await _client
        .post(
          _trpcUri(procedure),
          headers: await _headers(),
          body: jsonEncode({'json': input}),
        )
        .timeout(const Duration(seconds: 20));
    return _decode(response);
  }

  dynamic _decode(http.Response response) {
    dynamic decoded;
    try {
      decoded = jsonDecode(response.body);
    } catch (_) {
      throw ApiException('Resposta inválida do servidor',
          statusCode: response.statusCode);
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(_errorMessage(decoded),
          statusCode: response.statusCode);
    }
    if (decoded is Map<String, dynamic> && decoded['error'] != null) {
      throw ApiException(_errorMessage(decoded),
          statusCode: response.statusCode);
    }
    return decoded is Map<String, dynamic> && decoded['result'] is Map
        ? (decoded['result'] as Map)['data'] is Map
            ? (decoded['result'] as Map)['data']['json']
            : (decoded['result'] as Map)['data']
        : decoded;
  }

  String _errorMessage(dynamic decoded) {
    if (decoded is Map) {
      final error = decoded['error'];
      if (error is Map && error['json'] is Map) {
        return (error['json'] as Map)['message'] as String? ?? 'Falha na API';
      }
      if (error is String) return error;
      if (decoded['message'] is String) return decoded['message'] as String;
    }
    return 'Não foi possível concluir a operação';
  }

  Future<User?> me() async {
    final data = await query('auth.me');
    return data is Map ? User.fromJson(Map<String, dynamic>.from(data)) : null;
  }

  Future<Map<String, dynamic>> exchangeMobileOAuth(Uri callback) async {
    final base = AppConfig.apiBaseUrl.replaceFirst(RegExp(r'/$'), '');
    final uri = Uri.parse('$base/api/oauth/mobile').replace(queryParameters: {
      'code': callback.queryParameters['code'] ?? '',
      'state': callback.queryParameters['state'] ?? '',
    });
    final response = await _client
        .get(uri, headers: await _headers())
        .timeout(const Duration(seconds: 20));
    final decoded = jsonDecode(response.body);
    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        decoded is! Map) {
      throw const ApiException('Não foi possível concluir o login');
    }
    return Map<String, dynamic>.from(decoded);
  }

  Future<List<Product>> products({String? category}) async {
    final data = await query('pediu.marketplace.products', {
      if (category != null && category != 'Tudo') 'category': category,
    });
    return _list(data).map(Product.fromJson).toList();
  }

  Future<List<Product>> search(String text) async {
    final data = await query('pediu.marketplace.search', {
      'query': text,
      'limit': 50,
      'offset': 0,
    });
    final items = data is Map ? data['items'] : data;
    return _list(items).map(Product.fromJson).toList();
  }

  Future<List<Address>> addresses() async {
    final data = await query('pediu.addresses.list');
    return _list(data).map(Address.fromJson).toList();
  }

  Future<Address> createAddress(Map<String, dynamic> input) async {
    final data = await mutation('pediu.addresses.create', input);
    return Address.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Quote> quote(
      {required int storeId,
      required List<Map<String, dynamic>> items,
      String? couponCode}) async {
    final data = await query('pediu.checkout.quote', {
      'storeId': storeId,
      'items': items,
      if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
    });
    return Quote.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Map<String, dynamic>> createOrder(
      {required Map<String, dynamic> input}) async {
    final data = await mutation('pediu.orders.create', input);
    return Map<String, dynamic>.from(data as Map);
  }

  Future<PixCharge> createPix(int orderId) async {
    final data =
        await mutation('pediu.payments.createPix', {'orderId': orderId});
    return PixCharge.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<List<Order>> orders() async {
    final data = await query('pediu.orders.mine', {'limit': 50, 'offset': 0});
    return _list(data).map(Order.fromJson).toList();
  }

  Future<void> logout() async {
    try {
      await mutation('auth.logout');
    } finally {
      await _storage.clearSession();
    }
  }

  List<Map<String, dynamic>> _list(dynamic data) =>
      (data is List ? data : const [])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
}
