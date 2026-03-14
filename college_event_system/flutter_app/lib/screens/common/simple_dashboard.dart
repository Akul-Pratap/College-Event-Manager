import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/api_config.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';

class SimpleDashboard extends StatefulWidget {
  final String title;
  final String roleHint;

  const SimpleDashboard({super.key, required this.title, required this.roleHint});

  @override
  State<SimpleDashboard> createState() => _SimpleDashboardState();
}

class _SimpleDashboardState extends State<SimpleDashboard> {
  bool _loading = false;
  String _status = '';

  Future<void> _callHealth() async {
    setState(() {
      _loading = true;
      _status = '';
    });
    try {
      final api = context.read<ApiService>();
      final res = await api.get('${ApiConfig.baseUrl}/health');
      setState(() => _status = 'API OK: ${res['service'] ?? 'health'}');
    } catch (e) {
      setState(() => _status = 'API Error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _callMe() async {
    setState(() {
      _loading = true;
      _status = '';
    });
    try {
      final api = context.read<ApiService>();
      final res = await api.get('${ApiConfig.baseUrl}/auth/me');
      final user = res['user'] as Map?;
      setState(() => _status = user == null ? 'No profile returned.' : 'Me: ${user['name']} (${user['role']})');
    } catch (e) {
      setState(() => _status = 'Profile Error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          TextButton(
            onPressed: () async {
              await auth.logout();
              if (!context.mounted) return;
              Navigator.of(context).pushReplacementNamed('/login');
            },
            child: const Text('Logout'),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.roleHint,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'API Base: ${ApiConfig.baseUrl}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                FilledButton.icon(
                  onPressed: _loading ? null : _callHealth,
                  icon: const Icon(Icons.health_and_safety),
                  label: const Text('Test /health'),
                ),
                OutlinedButton.icon(
                  onPressed: _loading ? null : _callMe,
                  icon: const Icon(Icons.person),
                  label: const Text('Load /auth/me'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_loading) const LinearProgressIndicator(),
            if (_status.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: Theme.of(context).dividerColor),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(_status),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

