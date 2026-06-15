import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'constants.dart';
import 'screens/setup_screen.dart';
import 'screens/webview_screen.dart';
import 'services/background_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeBackgroundService();
  runApp(const OurSpaceApp());
}

class OurSpaceApp extends StatelessWidget {
  const OurSpaceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Our Space 💕',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFFFF4081),
        useMaterial3: true,
      ),
      home: const _StartupGate(),
    );
  }
}

class _StartupGate extends StatefulWidget {
  const _StartupGate();

  @override
  State<_StartupGate> createState() => _StartupGateState();
}

class _StartupGateState extends State<_StartupGate> {
  bool? _hasOwner;

  @override
  void initState() {
    super.initState();
    _checkOwner();
  }

  Future<void> _checkOwner() async {
    final prefs = await SharedPreferences.getInstance();
    final owner = prefs.getString(prefDeviceOwner);
    if (owner != null) {
      await startBackgroundServiceIfNeeded();
    }
    setState(() => _hasOwner = owner != null);
  }

  @override
  Widget build(BuildContext context) {
    if (_hasOwner == null) {
      return const Scaffold(
        backgroundColor: Color(0xFFFCE4EC),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFFFF4081)),
        ),
      );
    }
    return _hasOwner! ? const WebViewScreen() : const SetupScreen();
  }
}
