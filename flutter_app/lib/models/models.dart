class User {
  const User({
    required this.id,
    required this.openId,
    required this.name,
    required this.email,
    required this.role,
    required this.themePreference,
  });

  final int? id;
  final String? openId;
  final String? name;
  final String? email;
  final String role;
  final String themePreference;

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: _asInt(json['id']),
        openId: json['openId'] as String?,
        name: json['name'] as String?,
        email: json['email'] as String?,
        role: json['role'] as String? ?? 'user',
        themePreference: json['themePreference'] as String? ?? 'classic',
      );
}

class Product {
  const Product({
    required this.id,
    required this.storeId,
    required this.name,
    required this.category,
    required this.description,
    required this.price,
    required this.available,
    required this.storeName,
    required this.deliveryFee,
  });

  final int id;
  final int storeId;
  final String name;
  final String category;
  final String description;
  final double price;
  final bool available;
  final String storeName;
  final double deliveryFee;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: _asInt(json['id']) ?? 0,
        storeId: _asInt(json['storeId']) ?? 0,
        name: json['name'] as String? ?? 'Produto',
        category: json['category'] as String? ?? 'Geral',
        description: json['description'] as String? ?? '',
        price: _asDouble(json['price']),
        available: json['available'] == true || json['available'] == 1,
        storeName: json['storeName'] as String? ?? 'Loja',
        deliveryFee: _asDouble(json['deliveryFee']),
      );
}

class Address {
  const Address({
    required this.id,
    required this.label,
    required this.recipientName,
    required this.street,
    required this.number,
    required this.complement,
    required this.neighborhood,
    required this.city,
    required this.state,
    required this.postalCode,
    required this.isDefault,
  });

  final int id;
  final String label;
  final String recipientName;
  final String street;
  final String number;
  final String? complement;
  final String neighborhood;
  final String city;
  final String state;
  final String postalCode;
  final bool isDefault;

  String get formatted => [
        '$street, $number',
        if (complement?.isNotEmpty == true) complement!,
        '$neighborhood · $city/$state',
        postalCode,
      ].join(', ');

  factory Address.fromJson(Map<String, dynamic> json) => Address(
        id: _asInt(json['id']) ?? 0,
        label: json['label'] as String? ?? 'Endereço',
        recipientName: json['recipientName'] as String? ?? '',
        street: json['street'] as String? ?? '',
        number: json['number'] as String? ?? '',
        complement: json['complement'] as String?,
        neighborhood: json['neighborhood'] as String? ?? '',
        city: json['city'] as String? ?? '',
        state: json['state'] as String? ?? '',
        postalCode: json['postalCode'] as String? ?? '',
        isDefault: json['isDefault'] == true || json['isDefault'] == 1,
      );
}

class QuoteItem {
  const QuoteItem({
    required this.productId,
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
    this.note,
  });

  final int productId;
  final String name;
  final int quantity;
  final double unitPrice;
  final double lineTotal;
  final String? note;

  factory QuoteItem.fromJson(Map<String, dynamic> json) => QuoteItem(
        productId: _asInt(json['productId']) ?? 0,
        name: json['name'] as String? ?? 'Produto',
        quantity: _asInt(json['quantity']) ?? 1,
        unitPrice: _asDouble(json['unitPrice']),
        lineTotal: _asDouble(json['lineTotal']),
        note: json['note'] as String?,
      );
}

class Quote {
  const Quote({
    required this.storeId,
    required this.items,
    required this.subtotal,
    required this.deliveryFee,
    required this.discount,
    required this.total,
    this.couponCode,
  });

  final int storeId;
  final List<QuoteItem> items;
  final double subtotal;
  final double deliveryFee;
  final double discount;
  final double total;
  final String? couponCode;

  factory Quote.fromJson(Map<String, dynamic> json) => Quote(
        storeId: _asInt(json['storeId']) ?? 0,
        items: _asList(json['items'])
            .map((item) => QuoteItem.fromJson(item))
            .toList(),
        subtotal: _asDouble(json['subtotal']),
        deliveryFee: _asDouble(json['deliveryFee']),
        discount: _asDouble(json['discount']),
        total: _asDouble(json['total']),
        couponCode: json['couponCode'] as String?,
      );
}

class Order {
  const Order({
    required this.id,
    required this.storeId,
    required this.total,
    required this.status,
    required this.paymentMethod,
    required this.deliveryAddress,
    required this.createdAt,
  });

  final int id;
  final int storeId;
  final double total;
  final String status;
  final String paymentMethod;
  final String deliveryAddress;
  final DateTime? createdAt;

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: _asInt(json['id']) ?? 0,
        storeId: _asInt(json['storeId']) ?? 0,
        total: _asDouble(json['total']),
        status: json['status'] as String? ?? 'Pendente',
        paymentMethod: json['paymentMethod'] as String? ?? 'pix',
        deliveryAddress: json['deliveryAddress'] as String? ?? '',
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      );
}

class PixCharge {
  const PixCharge({
    required this.paymentId,
    required this.amount,
    required this.providerChargeId,
    required this.status,
    this.checkoutUrl,
    this.message,
  });

  final int paymentId;
  final double amount;
  final String? providerChargeId;
  final String status;
  final String? checkoutUrl;
  final String? message;

  factory PixCharge.fromJson(Map<String, dynamic> json) => PixCharge(
        paymentId: _asInt(json['paymentId']) ?? 0,
        amount: _asDouble(json['amount']),
        providerChargeId: json['providerChargeId'] as String?,
        status: json['status'] as String? ?? 'pending',
        checkoutUrl: json['checkoutUrl'] as String?,
        message: json['message'] as String?,
      );
}

int? _asInt(dynamic value) => value is int ? value : int.tryParse('$value');
double _asDouble(dynamic value) =>
    value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
List<Map<String, dynamic>> _asList(dynamic value) =>
    (value is List ? value : const [])
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
