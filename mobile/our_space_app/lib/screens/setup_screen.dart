import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants.dart';
import '../services/background_service.dart';
import 'webview_screen.dart';

const Color _accentColor = Color(0xFFFF4081);
const Color _bgColor = Color(0xFFFCE4EC);

class SetupScreen extends StatefulWidget {
  const SetupScreen({super.key});

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  bool _settingUp = false;

  Future<void> _choose(String owner) async {
    setState(() => _settingUp = true);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(prefDeviceOwner, owner);

    await _requestPermissions();
    await startBackgroundServiceIfNeeded();

    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const WebViewScreen()),
    );
  }

  Future<void> _requestPermissions() async {
    await Geolocator.requestPermission();
    await Permission.notification.request();
    await Permission.locationAlways.request();
    await Permission.ignoreBatteryOptimizations.request();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('💕', style: TextStyle(fontSize: 64)),
                const SizedBox(height: 16),
                const Text(
                  'Welcome to Our Space',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: _accentColor,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Who is using this phone?',
                  style: TextStyle(fontSize: 16, color: Color(0xFF333333)),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'This lets Our Space know whose location to share on the '
                  'SALPHA map and who to notify about. You can change this '
                  'later from the settings icon.',
                  style: TextStyle(fontSize: 13, color: Colors.black54),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 36),
                if (_settingUp)
                  const CircularProgressIndicator(color: _accentColor)
                else
                  Column(
                    children: [
                      _buildChoiceButton('Arnold', '💙', 'arnold'),
                      const SizedBox(height: 16),
                      _buildChoiceButton('Varaidzo', '💖', 'varaidzo'),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChoiceButton(String label, String emoji, String owner) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: () => _choose(owner),
        style: ElevatedButton.styleFrom(
          backgroundColor: _accentColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(50),
          ),
        ),
        child: Text('$emoji  I am $label', style: const TextStyle(fontSize: 16)),
      ),
    );
  }
}
