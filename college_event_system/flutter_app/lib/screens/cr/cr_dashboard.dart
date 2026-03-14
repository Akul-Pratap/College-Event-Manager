import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/api_config.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';

class CRDashboard extends StatefulWidget {
  const CRDashboard({super.key});

  @override
  State<CRDashboard> createState() => _CRDashboardState();
}

class _CRDashboardState extends State<CRDashboard> {
  bool _loading = true;
  String? _error;
  String? _eventTitle;
  double _myClassAmount = 0;
  double _departmentTotal = 0;
  int _liveEvents = 0;

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
          _eventTitle = null;
          _myClassAmount = 0;
          _departmentTotal = 0;
          _liveEvents = 0;
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
        _eventTitle = eventTitle;
        _myClassAmount = myAmount;
        _departmentTotal = deptTotal;
        _liveEvents = list.length;
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
        title: const Text('Class Representative'),
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
                      child: ListTile(
                        title: Text(
                          _eventTitle == null
                              ? 'No live events'
                              : 'Latest Live Event: $_eventTitle',
                        ),
                        subtitle: const Text(
                          'Data shown is from real backend money collection records.',
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    _tile(
                      'My Class Collection',
                      'Rs ${_myClassAmount.toStringAsFixed(0)}',
                      Icons.account_balance_wallet,
                    ),
                    const SizedBox(height: 12),
                    _tile(
                      'Department Collection',
                      'Rs ${_departmentTotal.toStringAsFixed(0)}',
                      Icons.savings,
                    ),
                    const SizedBox(height: 12),
                    _tile('Live Events', _liveEvents.toString(), Icons.event),
                  ],
                ),
    );
  }

  Widget _tile(String title, String value, IconData icon) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
    );
  }
}
