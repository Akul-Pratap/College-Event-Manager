import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    // Minimal init: listen for foreground messages and show a local notification.
    FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
      final title = message.notification?.title;
      final body = message.notification?.body;
      if (title == null && body == null) return;

      const androidDetails = AndroidNotificationDetails(
        'ltsu_events_default',
        'LTSU Events',
        channelDescription: 'General notifications',
        importance: Importance.high,
        priority: Priority.high,
      );

      const details = NotificationDetails(android: androidDetails);

      try {
        await _local.show(
          DateTime.now().millisecondsSinceEpoch ~/ 1000,
          title ?? 'LTSU Events',
          body ?? '',
          details,
        );
      } catch (e) {
        if (kDebugMode) {
          // ignore: avoid_print
          print('Local notification error: $e');
        }
      }
    });
  }

  Future<void> requestPermission() async {
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
  }
}

