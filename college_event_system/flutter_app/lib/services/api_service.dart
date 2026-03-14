import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class ApiService {
  // Setup headers with Authorization Token
  Future<Map<String, String>> _headers() async {
    final token = await ApiConfig.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Handle generic error responses (e.g., Auth failure or unauthorized access)
  Exception _handleError(http.Response response) {
    if (response.statusCode == 401) {
      // Clear token globally if authorization drops, require relogin
      ApiConfig.deleteToken();
      return Exception(
          '401 Unauthorized: Session Expired. Please log in again.');
    } else if (response.statusCode == 403) {
      return Exception(
          '403 Forbidden: You do not have the required permissions.');
    } else if (response.statusCode >= 500) {
      return Exception('500 Server Error: Internal Issue');
    }

    // Default to decoding string
    try {
      final body = jsonDecode(response.body);
      return Exception(
          body['message'] ?? body['error'] ?? 'API Request Failed');
    } catch (_) {
      return Exception(
          'API Request Failed w/ statusCode: ${response.statusCode}');
    }
  }

  // GET Request
  Future<dynamic> get(String url) async {
    final response = await http.get(
      Uri.parse(url),
      headers: await _headers(),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw _handleError(response);
    }
  }

  // POST Request
  Future<dynamic> post(String url, Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse(url),
      headers: await _headers(),
      body: jsonEncode(data),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw _handleError(response);
    }
  }

  // PUT Request
  Future<dynamic> put(String url, Map<String, dynamic> data) async {
    final response = await http.put(
      Uri.parse(url),
      headers: await _headers(),
      body: jsonEncode(data),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw _handleError(response);
    }
  }

  // PATCH Request
  Future<dynamic> patch(String url, Map<String, dynamic> data) async {
    final response = await http.patch(
      Uri.parse(url),
      headers: await _headers(),
      body: jsonEncode(data),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw _handleError(response);
    }
  }

  // DELETE Request
  Future<dynamic> delete(String url) async {
    final response = await http.delete(
      Uri.parse(url),
      headers: await _headers(),
    );

    if (response.statusCode == 200 || response.statusCode == 204) {
      return jsonDecode(response.body);
    } else {
      throw _handleError(response);
    }
  }
}
