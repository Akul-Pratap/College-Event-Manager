import 'package:flutter/material.dart';

import '../common/simple_dashboard.dart';

class VolunteerDashboard extends StatelessWidget {
  const VolunteerDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return const SimpleDashboard(
      title: 'Volunteer HQ',
      roleHint: 'Volunteer dashboard connected to live API checks.',
    );
  }
}
