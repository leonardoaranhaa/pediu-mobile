import 'package:flutter/foundation.dart';

class AppConfig {
  const AppConfig._();

  static String get apiBaseUrl {
    const configured = String.fromEnvironment('PEDIU_API_BASE_URL');
    if (configured.trim().isNotEmpty) return configured;
    if (kIsWeb) {
      final current = Uri.base;
      final apiHost = current.host.replaceFirst(RegExp(r'^8090-'), '3000-');
      return '${current.scheme}://$apiHost';
    }
    return 'http://10.0.2.2:3000';
  }

  static const oauthPortalUrl = String.fromEnvironment(
    'PEDIU_OAUTH_PORTAL_URL',
    defaultValue: '',
  );
  static const appId = String.fromEnvironment(
    'PEDIU_APP_ID',
    defaultValue: '',
  );
  static const redirectUri = String.fromEnvironment(
    'PEDIU_OAUTH_REDIRECT_URI',
    defaultValue: 'pediu://oauth/callback',
  );

  static bool get oauthConfigured =>
      oauthPortalUrl.trim().isNotEmpty && appId.trim().isNotEmpty;
}
