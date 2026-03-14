import 'package:flutter/material.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import '../config/api_config.dart';

class AuthService extends ChangeNotifier {
  String? _token;
  String? _role;
  String? _department;
  Map<String, dynamic>? _claims;

  String? get token => _token;
  String? get role => _role;
  String? get department => _department;
  Map<String, dynamic>? get claims => _claims;

  bool get isAuthenticated => _token != null && !JwtDecoder.isExpired(_token!);

  Future<void> initialize() async {
    _token = await ApiConfig.getToken();
    _parseToken();
    notifyListeners();
  }

  void _parseToken() {
    if (_token != null && !JwtDecoder.isExpired(_token!)) {
      try {
        final decodedToken = JwtDecoder.decode(_token!);
        _claims = decodedToken;

        // Common places this project may store role/department in Clerk tokens:
        // - top-level custom claims
        // - `metadata` (Next middleware uses `sessionClaims.metadata`)
        // - `publicMetadata` (older client-side patterns)
        final meta = (decodedToken['metadata'] is Map)
            ? decodedToken['metadata'] as Map
            : null;
        final publicMeta = (decodedToken['publicMetadata'] is Map)
            ? decodedToken['publicMetadata'] as Map
            : null;

        _role = (decodedToken['role'] as String?) ??
            (meta?['role'] as String?) ??
            (publicMeta?['role'] as String?);

        _department = (decodedToken['department_id'] as String?) ??
            (decodedToken['department'] as String?) ??
            (meta?['department'] as String?) ??
            (publicMeta?['department'] as String?);
      } catch (e) {
        _role = null;
        _department = null;
        _claims = null;
        _token = null;
      }
    }
  }

  Future<void> loginWithClerkToken(String clerkToken) async {
    await ApiConfig.saveToken(clerkToken);
    _token = clerkToken;
    _parseToken();
    notifyListeners();
  }

  Future<void> logout() async {
    await ApiConfig.deleteToken();
    _token = null;
    _role = null;
    _department = null;
    _claims = null;
    notifyListeners();
  }

  // Returns the expected route for the user's role
  String getDashboardRoute() {
    if (!isAuthenticated || _role == null) return '/login';
    switch (_role) {
      case 'student':
        return '/student';
      case 'organizer':
        return '/organizer';
      case 'hod':
        return '/hod';
      case 'faculty_coordinator':
        return '/faculty';
      case 'volunteer':
        return '/volunteer';
      case 'super_admin':
        return '/admin';
      case 'class_incharge':
        return '/class-incharge';
      case 'cr':
        return '/cr';
      default:
        return '/login';
    }
  }

  Future<bool> checkAuthStatus() async {
    await initialize();
    return isAuthenticated;
  }
}
