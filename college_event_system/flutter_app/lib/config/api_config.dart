import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  // Configure with --dart-define=API_BASE_URL=... for device/prod environments.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api',
  );

  // Auth endpoints
  static const String loginEndpoint = '$baseUrl/auth/login';
  static const String registerEndpoint = '$baseUrl/auth/register';

  // Specific endpoints
  static const String eventsEndpoint = '$baseUrl/events';
  static const String qrEndpoint = '$baseUrl/qr';
  static const String attendanceEndpoint = '$baseUrl/attendance';

  static const String _tokenKey = 'auth_token';

  // Securely store the JWT token
  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  // Retrieve the stored JWT token
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  // Remove the token during logout
  static Future<void> deleteToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }
}
