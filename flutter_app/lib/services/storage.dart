import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';

class SessionStorage {
  const SessionStorage();

  static const _sessionKey = 'pediu_flutter_session';
  static const _userKey = 'pediu_flutter_user';
  static const _cartKey = 'pediu_flutter_cart';
  static const _secure = FlutterSecureStorage();

  Future<String?> readToken() => _secure.read(key: _sessionKey);

  Future<void> writeSession(String token, User user) async {
    await _secure.write(key: _sessionKey, value: token);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        _userKey,
        jsonEncode({
          'id': user.id,
          'openId': user.openId,
          'name': user.name,
          'email': user.email,
          'role': user.role,
          'themePreference': user.themePreference,
        }));
  }

  Future<User?> readUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw == null) return null;
    try {
      return User.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> clearSession() async {
    await _secure.delete(key: _sessionKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
  }

  Future<List<Map<String, dynamic>>> readCart() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_cartKey);
    if (raw == null) return [];
    try {
      final decoded = jsonDecode(raw);
      return (decoded as List)
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> writeCart(List<Map<String, dynamic>> cart) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cartKey, jsonEncode(cart));
  }
}
