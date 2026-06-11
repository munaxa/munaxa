import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import 'student_home_screen.dart';
import 'student_timetable_screen.dart';
import 'student_homework_screen.dart';
import 'student_resources_screen.dart';

/// The student app frame: app bar (sign-out) over the dashboard / timetable /
/// homework / resources tabs.
class StudentShell extends ConsumerStatefulWidget {
  const StudentShell({super.key});

  @override
  ConsumerState<StudentShell> createState() => _StudentShellState();
}

class _StudentShellState extends ConsumerState<StudentShell> {
  int _index = 0;

  static const _titles = ['My day', 'Timetable', 'Homework', 'Resources'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_index]),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: const [
          StudentDashboardTab(),
          StudentTimetableTab(),
          StudentHomeworkTab(),
          StudentResourcesTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.calendar_today_outlined), label: 'Timetable'),
          NavigationDestination(icon: Icon(Icons.assignment_outlined), label: 'Homework'),
          NavigationDestination(icon: Icon(Icons.school_outlined), label: 'Resources'),
        ],
      ),
    );
  }
}
