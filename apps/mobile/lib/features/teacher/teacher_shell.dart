import 'package:flutter/material.dart';

import '../settings/locale_toggle.dart';
import 'teacher_class_screen.dart';
import 'teacher_home_screen.dart';
import 'teacher_account_screen.dart';

/// The teacher app frame: class (offline-first attendance capture) · notifications · account.
class TeacherShell extends StatefulWidget {
  const TeacherShell({super.key});

  @override
  State<TeacherShell> createState() => _TeacherShellState();
}

class _TeacherShellState extends State<TeacherShell> {
  int _index = 0;

  static const _titles = ['My class', 'Notifications', 'Account'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_index]),
        actions: const [LocaleToggleButton()],
      ),
      body: IndexedStack(
        index: _index,
        children: const [
          TeacherClassTab(),
          TeacherNotificationsTab(),
          TeacherAccountTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.fact_check_outlined), label: 'Class'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), label: 'Notifications'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Account'),
        ],
      ),
    );
  }
}
