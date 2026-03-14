import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/api_config.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';

class ClassInchargeDashboard extends StatefulWidget {
  const ClassInchargeDashboard({super.key});

  @override
  State<ClassInchargeDashboard> createState() => _ClassInchargeDashboardState();
}

class _ClassInchargeDashboardState extends State<ClassInchargeDashboard> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _profile;
  String? _eventTitle;
  int _totalClasses = 0;
  double _deptTotal = 0;
  double _myClassAmount = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final api = context.read<ApiService>();
      final me = await api.get('${ApiConfig.baseUrl}/auth/me');
      final events = await api.get(
        '${ApiConfig.baseUrl}/events?status=live&limit=20',
      );

      final user = (me['user'] ?? {}) as Map<String, dynamic>;
      final list = (events['events'] ?? []) as List<dynamic>;

      if (list.isEmpty) {
        setState(() {
          _profile = user;
          _eventTitle = null;
          _totalClasses = 0;
          _deptTotal = 0;
          _myClassAmount = 0;
        });
        return;
      }

      final eventId = list.first['id'] as String;
      final eventTitle = (list.first['title'] ?? 'Live Event') as String;
      final coll = await api.get(
        '${ApiConfig.baseUrl}/events/$eventId/money-collection',
      );
      final rows = (coll['collection'] ?? []) as List<dynamic>;

      double deptTotal = 0;
      double myAmount = 0;
      for (final r in rows) {
        final amount = (r['amount_collected'] as num?)?.toDouble() ?? 0;
        deptTotal += amount;
        if (r['year'] == user['year'] &&
            r['branch'] == user['branch'] &&
            r['section'] == user['section']) {
          myAmount = amount;
        }
      }

      setState(() {
        _profile = user;
        _eventTitle = eventTitle;
        _totalClasses = rows.length;
        _deptTotal = deptTotal;
        _myClassAmount = myAmount;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Class Incharge'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await context.read<AuthService>().logout();
              if (context.mounted) {
                Navigator.of(context).pushReplacementNamed('/login');
              }
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Failed to load: $_error'))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _eventTitle == null
                                  ? 'No live events'
                                  : 'Latest Live Event: $_eventTitle',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Class: ${_profile?['year'] ?? '-'} ${_profile?['branch'] ?? '-'} ${_profile?['section'] ?? '-'}',
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    _statCard(
                      'Tracked Class Entries',
                      _totalClasses.toString(),
                      Colors.blue,
                    ),
                    const SizedBox(height: 12),
                    _statCard(
                      'Department Collection',
                      'Rs ${_deptTotal.toStringAsFixed(0)}',
                      Colors.green,
                    ),
                    const SizedBox(height: 12),
                    _statCard(
                      'My Class Collection',
                      'Rs ${_myClassAmount.toStringAsFixed(0)}',
                      Colors.indigo,
                    ),
                  ],
                ),
    );
  }

  Widget _statCard(String title, String value, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withValues(alpha: 0.15),
              child: Icon(Icons.analytics, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontSize: 13, color: Colors.black54),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
