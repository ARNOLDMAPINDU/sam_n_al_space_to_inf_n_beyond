import 'dart:async';
import 'dart:convert';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../constants.dart';

final FlutterLocalNotificationsPlugin _notifications =
    FlutterLocalNotificationsPlugin();

/// Sets up notification channels and configures (but does not necessarily
/// start) the background service. Safe to call multiple times.
Future<void> initializeBackgroundService() async {
  const AndroidNotificationChannel serviceChannel = AndroidNotificationChannel(
    serviceChannelId,
    serviceChannelName,
    description: 'Keeps Our Space syncing location & partner updates.',
    importance: Importance.low,
  );

  const AndroidNotificationChannel partnerChannel = AndroidNotificationChannel(
    partnerChannelId,
    partnerChannelName,
    description: 'Alerts when your partner logs in, messages or shares a mood.',
    importance: Importance.high,
  );

  final androidPlugin = _notifications
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
  await androidPlugin?.createNotificationChannel(serviceChannel);
  await androidPlugin?.createNotificationChannel(partnerChannel);

  await _notifications.initialize(
    settings: const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    ),
  );

  final service = FlutterBackgroundService();
  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onServiceStart,
      autoStart: false,
      isForegroundMode: true,
      autoStartOnBoot: true,
      notificationChannelId: serviceChannelId,
      initialNotificationTitle: 'Our Space 💕',
      initialNotificationContent: 'Keeping you connected...',
      foregroundServiceNotificationId: 888,
    ),
    iosConfiguration: IosConfiguration(),
  );
}

/// Starts the background service if it isn't already running.
Future<void> startBackgroundServiceIfNeeded() async {
  final service = FlutterBackgroundService();
  final isRunning = await service.isRunning();
  if (!isRunning) {
    await service.startService();
  }
}

@pragma('vm:entry-point')
void onServiceStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  if (service is AndroidServiceInstance) {
    service.on('stopService').listen((event) {
      service.stopSelf();
    });
  }

  // Run once immediately, then on a fixed interval.
  await _runSyncTick(service);
  Timer.periodic(backgroundSyncInterval, (timer) async {
    await _runSyncTick(service);
  });
}

Future<void> _runSyncTick(ServiceInstance service) async {
  final prefs = await SharedPreferences.getInstance();
  final owner = prefs.getString(prefDeviceOwner);
  if (owner == null) return; // Setup not completed yet.

  final partner = otherOwner(owner);
  final partnerName = partnerDisplayNames[partner] ?? partner;

  await _syncLocation(owner);
  await _checkPartnerStatus(prefs, partner, partnerName);
  await _checkPartnerMood(prefs, partner, partnerName);
  await _checkPartnerChat(prefs, owner, partner, partnerName);
  await _checkPartnerSOS(prefs, partner, partnerName);

  prefs.setBool(prefHasSyncedOnce, true);

  if (service is AndroidServiceInstance) {
    if (await service.isForegroundService()) {
      final time = TimeOfDay.now();
      final timeStr =
          '${time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod}:${time.minute.toString().padLeft(2, '0')} ${time.period == DayPeriod.am ? 'AM' : 'PM'}';
      _notifications.show(
        id: 888,
        title: 'Our Space 💕',
        body: 'Last synced at $timeStr',
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            serviceChannelId,
            serviceChannelName,
            icon: '@mipmap/ic_launcher',
            ongoing: true,
            importance: Importance.low,
            priority: Priority.low,
          ),
        ),
      );
    }
  }
}

Future<void> _syncLocation(String owner) async {
  try {
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return;
    }
    if (!await Geolocator.isLocationServiceEnabled()) return;

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    );

    await http.put(
      Uri.parse('$firebaseDbBaseUrl/locations/$owner.json'),
      body: jsonEncode({
        'lat': position.latitude,
        'lng': position.longitude,
        'accuracy': position.accuracy,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      }),
    );
  } catch (_) {
    // Location unavailable this tick; try again next interval.
  }
}

Future<void> _checkPartnerStatus(
    SharedPreferences prefs, String partner, String partnerName) async {
  try {
    final response = await http
        .get(Uri.parse('$firebaseDbBaseUrl/status/$partner.json'));
    if (response.statusCode != 200) return;

    final status = jsonDecode(response.body) as String?;
    final lastStatus = prefs.getString(prefLastPartnerStatus);
    final hasSyncedOnce = prefs.getBool(prefHasSyncedOnce) ?? false;

    if (hasSyncedOnce &&
        status == 'online' &&
        lastStatus != 'online' &&
        status != null) {
      await _showPartnerNotification(
        id: 100,
        title: '💕 $partnerName is here!',
        body: '$partnerName just logged into Our Space. Say hi!',
      );
    }

    if (status != null) {
      prefs.setString(prefLastPartnerStatus, status);
    }
  } catch (_) {}
}

Future<void> _checkPartnerMood(
    SharedPreferences prefs, String partner, String partnerName) async {
  try {
    final response =
        await http.get(Uri.parse('$firebaseDbBaseUrl/moods/$partner.json'));
    if (response.statusCode != 200 || response.body == 'null') return;

    final data = jsonDecode(response.body) as Map<String, dynamic>?;
    if (data == null) return;

    final timestamp = data['timestamp'];
    final mood = data['mood']?.toString() ?? '';
    final lastTimestamp = prefs.getInt(prefLastPartnerMoodTimestamp);
    final hasSyncedOnce = prefs.getBool(prefHasSyncedOnce) ?? false;

    if (hasSyncedOnce && timestamp is int && timestamp != lastTimestamp) {
      await _showPartnerNotification(
        id: 101,
        title: '$partnerName is feeling $mood',
        body: 'Open Our Space to respond 💌',
      );
    }

    if (timestamp is int) {
      prefs.setInt(prefLastPartnerMoodTimestamp, timestamp);
    }
  } catch (_) {}
}

Future<void> _checkPartnerChat(SharedPreferences prefs, String owner,
    String partner, String partnerName) async {
  try {
    final chatUri = Uri.parse('$firebaseDbBaseUrl/chat.json').replace(
      queryParameters: {'orderBy': '"\$key"', 'limitToLast': '1'},
    );
    final response = await http.get(chatUri);
    if (response.statusCode != 200 || response.body == 'null') return;

    final data = jsonDecode(response.body) as Map<String, dynamic>?;
    if (data == null || data.isEmpty) return;

    final entry = data.entries.first;
    final key = entry.key;
    final value = entry.value as Map<String, dynamic>;
    final lastKey = prefs.getString(prefLastChatKey);
    final hasSyncedOnce = prefs.getBool(prefHasSyncedOnce) ?? false;

    final sender = value['sender']?.toString().toLowerCase() ?? '';

    if (hasSyncedOnce && key != lastKey && sender == partner) {
      String preview;
      final text = value['text']?.toString();
      if (text != null && text.isNotEmpty) {
        preview = text.length > 60 ? '${text.substring(0, 60)}...' : text;
      } else if (value['mediaType']?.toString() == 'video') {
        preview = 'sent a video 🎥';
      } else if (value.containsKey('mediaUrl')) {
        preview = 'sent a photo 📷';
      } else {
        preview = 'sent you something 💌';
      }

      await _showPartnerNotification(
        id: 102,
        title: '💌 New message from $partnerName',
        body: preview,
      );
    }

    prefs.setString(prefLastChatKey, key);
  } catch (_) {}
}

Future<void> _checkPartnerSOS(
    SharedPreferences prefs, String partner, String partnerName) async {
  try {
    final response =
        await http.get(Uri.parse('$firebaseDbBaseUrl/sos/$partner.json'));
    if (response.statusCode != 200 || response.body == 'null') return;

    final data = jsonDecode(response.body) as Map<String, dynamic>?;
    if (data == null) return;

    final timestamp = data['timestamp'];
    final lastTimestamp = prefs.getInt(prefLastPartnerSosTimestamp);
    final hasSyncedOnce = prefs.getBool(prefHasSyncedOnce) ?? false;

    if (hasSyncedOnce && timestamp is int && timestamp != lastTimestamp) {
      await _showPartnerNotification(
        id: 103,
        title: '💔 $partnerName needs you right now',
        body: 'Reach out to them now — a call or message means everything.',
      );
    }

    if (timestamp is int) {
      prefs.setInt(prefLastPartnerSosTimestamp, timestamp);
    }
  } catch (_) {}
}

Future<void> _showPartnerNotification({
  required int id,
  required String title,
  required String body,
}) async {
  await _notifications.show(
    id: id,
    title: title,
    body: body,
    notificationDetails: const NotificationDetails(
      android: AndroidNotificationDetails(
        partnerChannelId,
        partnerChannelName,
        icon: '@mipmap/ic_launcher',
        importance: Importance.high,
        priority: Priority.high,
      ),
    ),
  );
}
