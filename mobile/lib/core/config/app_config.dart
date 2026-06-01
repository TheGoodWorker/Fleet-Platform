import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Configuration globale chargée depuis .env
class AppConfig {
  AppConfig._();

  static String get baseUrl =>
      dotenv.env['API_BASE_URL'] ?? 'http://localhost:3000/api/v1';

  static int get timeoutSeconds =>
      int.tryParse(dotenv.env['API_TIMEOUT_SECONDS'] ?? '30') ?? 30;

  static String get env => dotenv.env['ENV'] ?? 'development';

  static bool get isDevelopment => env == 'development';
  static bool get isProduction => env == 'production';
}
