import 'package:flutter/material.dart';

import '../common/simple_dashboard.dart';

class FacultyDashboard extends StatelessWidget {
  const FacultyDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return const SimpleDashboard(
      title: 'Faculty Coordinator',
      roleHint: 'Faculty dashboard connected to live API checks.',
    );
  }
}
