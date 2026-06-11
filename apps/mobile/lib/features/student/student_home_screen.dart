import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../shell/dashboard_widgets.dart';
import 'student_providers.dart';

/// Student home: gamification + attendance + homework rollup.
class StudentHomeScreen extends ConsumerWidget {
  const StudentHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(studentDashboardProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('My day'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(studentDashboardProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            dashAsync.when(
              loading: () => const AsyncSection(loading: true, error: null, child: SizedBox()),
              error: (e, _) => AsyncSection(
                loading: false,
                error: e,
                onRetry: () => ref.invalidate(studentDashboardProvider),
                child: const SizedBox(),
              ),
              data: (dash) {
                final rate = attendanceRate(dash.attendanceLast30Days);
                return GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.5,
                  children: [
                    MetricCard(
                      label: 'Points',
                      value: '${dash.totalPoints}',
                      icon: Icons.stars,
                    ),
                    MetricCard(
                      label: 'Level',
                      value: '${dash.level}',
                      icon: Icons.trending_up,
                    ),
                    MetricCard(
                      label: 'Streak',
                      value: '${dash.currentStreak}d',
                      icon: Icons.local_fire_department,
                    ),
                    MetricCard(
                      label: 'Attendance (30d)',
                      value: rate != null ? '$rate%' : '—',
                      icon: Icons.event_available,
                    ),
                    MetricCard(
                      label: 'Homework due',
                      value: '${dash.upcomingHomework}',
                      icon: Icons.menu_book,
                    ),
                    MetricCard(
                      label: 'Achievements',
                      value: '${dash.achievementCount}',
                      icon: Icons.emoji_events,
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
