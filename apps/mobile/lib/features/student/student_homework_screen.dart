import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../shell/dashboard_widgets.dart';
import 'student_providers.dart';

/// The student's homework list, ordered by due date.
class StudentHomeworkTab extends ConsumerWidget {
  const StudentHomeworkTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hwAsync = ref.watch(studentHomeworkProvider);
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(studentHomeworkProvider),
      child: hwAsync.when(
        loading: () => const AsyncSection(loading: true, error: null, child: SizedBox()),
        error: (e, _) => AsyncSection(
          loading: false,
          error: e,
          onRetry: () => ref.invalidate(studentHomeworkProvider),
          child: const SizedBox(),
        ),
        data: (items) {
          if (items.isEmpty) {
            return ListView(
              children: const [
                Padding(padding: EdgeInsets.all(24), child: Text('No homework. Enjoy! 🎉')),
              ],
            );
          }
          final sorted = [...items]..sort((a, b) => a.dueDate.compareTo(b.dueDate));
          return ListView.builder(
            padding: const EdgeInsets.all(8),
            itemCount: sorted.length,
            itemBuilder: (context, i) {
              final hw = sorted[i];
              return Card(
                child: ListTile(
                  leading: const Icon(Icons.assignment_outlined),
                  title: Text(hw.title),
                  subtitle: Text(
                    hw.description == null ? hw.subject : '${hw.subject} · ${hw.description}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: Text(
                    hw.dueDate,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
