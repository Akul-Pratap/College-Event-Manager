import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/api_config.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';

class StudentDashboard extends StatefulWidget {
  const StudentDashboard({super.key});

  @override
  State<StudentDashboard> createState() => _StudentDashboardState();
}

class _StudentDashboardState extends State<StudentDashboard> {
  int _selectedIndex = 0;

  final List<Widget> _pages = [
    const StudentHome(),
    const StudentEvents(),
    const StudentRegistrations(),
    const StudentProfile(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: _pages[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (int index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Home'),
          NavigationDestination(
              icon: Icon(Icons.event_outlined),
              selectedIcon: Icon(Icons.event),
              label: 'Events'),
          NavigationDestination(
              icon: Icon(Icons.bookmark_outline),
              selectedIcon: Icon(Icons.bookmark),
              label: 'My Tickets'),
          NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile'),
        ],
      ),
    );
  }
}

class StudentHome extends StatefulWidget {
  const StudentHome({super.key});

  @override
  State<StudentHome> createState() => _StudentHomeState();
}

class _StudentHomeState extends State<StudentHome> {
  bool _loading = true;
  String? _error;
  List<dynamic> _events = const [];

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiService>();
      final data =
          await api.get('${ApiConfig.baseUrl}/events?status=live&limit=10');
      setState(() {
        _events = (data['events'] ?? []) as List<dynamic>;
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
    return SafeArea(
      child: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating: true,
            title: const Text(
              'Hello, Student',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: _loadEvents,
              ),
            ],
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16.0),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _buildAIFeedCard(_events),
                const SizedBox(height: 24),
                const Text('Upcoming Events',
                    style:
                        TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_error != null)
                  Text(
                    'Failed to load events: $_error',
                    style: const TextStyle(color: Colors.red),
                  )
                else
                  _buildEventHorizontalList(_events),
                const SizedBox(height: 24),
                const Text('Clubs In Live Events',
                    style:
                        TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                _buildClubHorizontalList(_events),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAIFeedCard(List<dynamic> events) {
    final first =
        events.isNotEmpty ? events.first as Map<String, dynamic> : null;
    final title = (first?['title'] ?? 'No live recommendations yet').toString();
    final date = (first?['date'] ?? '').toString();
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
            colors: [Colors.indigo.shade600, Colors.blue.shade500]),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: Colors.indigo.withValues(alpha: 0.3),
              blurRadius: 10,
              offset: const Offset(0, 5)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: Colors.amber, size: 24),
              const SizedBox(width: 8),
              Text('AI Recommended',
                  style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            events.isEmpty
                ? 'Recommendations will appear when live events are available for your department.'
                : '$title${date.isEmpty ? '' : ' on $date'}',
            style:
                const TextStyle(color: Colors.white, fontSize: 16, height: 1.4),
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: null,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: Colors.indigo.shade600,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Live Data Only'),
          ),
        ],
      ),
    );
  }

  Widget _buildEventHorizontalList(List<dynamic> events) {
    if (events.isEmpty) {
      return const Text(
        'No live events available right now.',
        style: TextStyle(color: Colors.black54),
      );
    }

    return SizedBox(
      height: 200,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: events.length,
        itemBuilder: (context, index) {
          final e = (events[index] as Map<String, dynamic>);
          final title = (e['title'] ?? 'Untitled Event').toString();
          final date = (e['date'] ?? '').toString();
          final venue = ((e['venues'] as Map<String, dynamic>?)?['name'] ?? '-')
              .toString();
          return Container(
            width: 280,
            margin: const EdgeInsets.only(right: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 100,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(16)),
                  ),
                  child: Center(
                      child: Icon(Icons.image, color: Colors.grey.shade500)),
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.calendar_today,
                              size: 14, color: Colors.grey[600]),
                          const SizedBox(width: 4),
                          Text(date,
                              style: TextStyle(
                                  color: Colors.grey[600], fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        venue,
                        style: TextStyle(color: Colors.grey[700], fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildClubHorizontalList(List<dynamic> events) {
    final Set<String> clubs = {};
    for (final item in events) {
      final e = item as Map<String, dynamic>;
      final club =
          ((e['clubs'] as Map<String, dynamic>?)?['name'] ?? '').toString();
      if (club.isNotEmpty) {
        clubs.add(club);
      }
    }
    final clubList = clubs.toList();

    if (clubList.isEmpty) {
      return const Text(
        'No club information available from live events yet.',
        style: TextStyle(color: Colors.black54),
      );
    }

    return SizedBox(
      height: 120,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: clubList.length,
        itemBuilder: (context, index) {
          final clubName = clubList[index];
          return Container(
            width: 100,
            margin: const EdgeInsets.only(right: 16),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 35,
                  backgroundColor: Colors.indigo.shade50,
                  child: Icon(Icons.group,
                      color: Colors.indigo.shade400, size: 30),
                ),
                const SizedBox(height: 8),
                Text(clubName,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w500)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class StudentEvents extends StatefulWidget {
  const StudentEvents({super.key});

  @override
  State<StudentEvents> createState() => _StudentEventsState();
}

class _StudentEventsState extends State<StudentEvents> {
  bool _loading = true;
  String? _error;
  List<dynamic> _events = const [];

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiService>();
      final data = await api.get('${ApiConfig.baseUrl}/events?limit=25');
      setState(() {
        _events = (data['events'] ?? []) as List<dynamic>;
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
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(child: Text('Failed to load events: $_error'));
    }
    if (_events.isEmpty) {
      return const Center(child: Text('No events available.'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _events.length,
      itemBuilder: (context, index) {
        final e = (_events[index] as Map<String, dynamic>);
        return Card(
          child: ListTile(
            leading: const Icon(Icons.event),
            title: Text((e['title'] ?? 'Untitled Event').toString()),
            subtitle: Text((e['date'] ?? '').toString()),
          ),
        );
      },
    );
  }
}

class StudentRegistrations extends StatefulWidget {
  const StudentRegistrations({super.key});

  @override
  State<StudentRegistrations> createState() => _StudentRegistrationsState();
}

class _StudentRegistrationsState extends State<StudentRegistrations> {
  bool _loading = true;
  String? _error;
  List<dynamic> _registrations = const [];

  @override
  void initState() {
    super.initState();
    _loadRegistrations();
  }

  Future<void> _loadRegistrations() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiService>();
      final data = await api.get('${ApiConfig.baseUrl}/my-registrations');
      setState(() {
        _registrations = (data['registrations'] ?? []) as List<dynamic>;
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
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(child: Text('Failed to load registrations: $_error'));
    }
    if (_registrations.isEmpty) {
      return const Center(child: Text('No registrations found.'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _registrations.length,
      itemBuilder: (context, index) {
        final r = (_registrations[index] as Map<String, dynamic>);
        final event = (r['events'] as Map<String, dynamic>?);
        final title = (event?['title'] ?? 'Event').toString();
        final status = (r['status'] ?? 'unknown').toString();
        return Card(
          child: ListTile(
            leading: const Icon(Icons.confirmation_number),
            title: Text(title),
            subtitle: Text('Status: $status'),
          ),
        );
      },
    );
  }
}

class StudentProfile extends StatelessWidget {
  const StudentProfile({super.key});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: ElevatedButton(
        onPressed: () async {
          final auth = context.read<AuthService>();
          await auth.logout();
          if (context.mounted) {
            Navigator.of(context).pushReplacementNamed('/login');
          }
        },
        child: const Text('Logout'),
      ),
    );
  }
}
