import 'package:flutter/material.dart';

import '../common/simple_dashboard.dart';

class OrganizerDashboard extends StatelessWidget {
  const OrganizerDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return const SimpleDashboard(
      title: 'Organizer Panel',
      roleHint: 'Organizer dashboard connected to live API checks.',
    );
  }
}
