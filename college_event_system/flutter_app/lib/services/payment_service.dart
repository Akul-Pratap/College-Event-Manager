import 'package:flutter/foundation.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class PaymentService extends ChangeNotifier {
  final ApiService _apiService;

  PaymentService(this._apiService);

  Future<Map<String, dynamic>> initiatePayment(String eventId, double amount) async {
    try {
      final response = await _apiService.post('${ApiConfig.baseUrl}/payments/initiate', {
        'event_id': eventId,
        'amount': amount,
      });
      return response;
    } catch (e) {
      debugPrint('Error initiating payment: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> verifyPayment(String transactionId, String screenshotUrl) async {
    try {
      final response = await _apiService.post('${ApiConfig.baseUrl}/payments/verify', {
        'transaction_id': transactionId,
        'screenshot_url': screenshotUrl,
      });
      return response;
    } catch (e) {
      debugPrint('Error verifying payment: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getPaymentStatus(String paymentId) async {
    try {
      final response = await _apiService.get('${ApiConfig.baseUrl}/payments/$paymentId');
      return response;
    } catch (e) {
      debugPrint('Error getting payment status: $e');
      rethrow;
    }
  }
}
