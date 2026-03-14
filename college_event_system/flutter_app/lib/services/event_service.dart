import 'package:flutter/foundation.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class EventService extends ChangeNotifier {
  final ApiService _apiService;

  EventService(this._apiService);

  Future<List<dynamic>> getAllEvents() async {
    try {
      final response = await _apiService.get('${ApiConfig.baseUrl}/events');
      return response['events'] as List<dynamic>? ?? [];
    } catch (e) {
      debugPrint('Error fetching events: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getEventDetails(String id) async {
    try {
      final response = await _apiService.get('${ApiConfig.baseUrl}/events/$id');
      return response;
    } catch (e) {
      debugPrint('Error fetching event details: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createEvent(Map<String, dynamic> eventData) async {
    try {
      final response = await _apiService.post('${ApiConfig.baseUrl}/events', eventData);
      return response;
    } catch (e) {
      debugPrint('Error creating event: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> registerForEvent(String id, Map<String, dynamic> formData) async {
    try {
      final response = await _apiService.post('${ApiConfig.baseUrl}/events/$id/register', formData);
      return response;
    } catch (e) {
      debugPrint('Error registering for event: $e');
      rethrow;
    }
  }
}
