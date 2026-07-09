import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../constants.dart';
import 'setup_screen.dart';

const Color _accentColor = Color(0xFFFF4081);
const Color _bgColor = Color(0xFFFCE4EC);

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(_bgColor)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _isLoading = true),
          onPageFinished: (_) => setState(() => _isLoading = false),
        ),
      )
      ..loadRequest(Uri.parse(ourSpaceWebUrl));
  }

  Future<void> _openSettings() async {
    final action = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Settings'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(context, 'refresh'),
            child: const Row(
              children: [
                Icon(Icons.refresh, color: _accentColor),
                SizedBox(width: 12),
                Text('Refresh (clear cache & reload)'),
              ],
            ),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(context, 'change-owner'),
            child: const Row(
              children: [
                Icon(Icons.swap_horiz, color: _accentColor),
                SizedBox(width: 12),
                Text('Change device owner'),
              ],
            ),
          ),
        ],
      ),
    );

    if (action == 'refresh') {
      await _refreshWebView();
    } else if (action == 'change-owner') {
      await _confirmChangeOwner();
    }
  }

  // Stale cached content (old script.js / old HTML) can hide new features and
  // real-time updates — e.g. a pending SOS alert not showing until the app's
  // cache is cleared. This gives a one-tap way to fix that without needing to
  // clear the app's cache from Android system settings.
  Future<void> _refreshWebView() async {
    setState(() => _isLoading = true);
    await _controller.clearCache();
    await _controller.clearLocalStorage();
    await _controller.reload();
  }

  Future<void> _confirmChangeOwner() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change device owner?'),
        content: const Text(
            'This will restart setup so you can pick whether this phone '
            'belongs to Arnold or Varaidzo.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Change'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(prefDeviceOwner);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const SetupScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          _controller.goBack();
        } else {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: _bgColor,
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_isLoading)
                const Center(
                  child: CircularProgressIndicator(color: _accentColor),
                ),
              Positioned(
                top: 4,
                left: 4,
                child: Material(
                  color: Colors.white.withValues(alpha: 0.6),
                  shape: const CircleBorder(),
                  child: IconButton(
                    icon: const Icon(Icons.settings, color: _accentColor, size: 20),
                    onPressed: _openSettings,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
