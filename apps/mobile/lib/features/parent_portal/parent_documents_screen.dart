import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../shell/dashboard_widgets.dart';
import 'parent_portal_providers.dart';

/// The selected child's document vault (read-only list). Upload is added with a file picker later.
class ParentDocumentsTab extends ConsumerWidget {
  const ParentDocumentsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final docsAsync = ref.watch(childDocumentsProvider);
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(childDocumentsProvider),
      child: docsAsync.when(
        loading: () => const AsyncSection(loading: true, error: null, child: SizedBox()),
        error: (e, _) => AsyncSection(
          loading: false,
          error: e,
          onRetry: () => ref.invalidate(childDocumentsProvider),
          child: const SizedBox(),
        ),
        data: (docs) {
          if (docs.isEmpty) {
            return ListView(
              children: const [
                Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('No documents for this child yet.'),
                ),
              ],
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(8),
            itemCount: docs.length,
            itemBuilder: (context, i) {
              final d = docs[i];
              return Card(
                child: ListTile(
                  leading: const Icon(Icons.description),
                  title: Text(d.title),
                  subtitle: Text('${d.category} · ${d.fileName}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
