import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/structure/structure_api.dart';
import '../../l10n/strings.dart';
import '../attendance/attendance_controller.dart';
import '../auth/auth_providers.dart';
import '../people/people_providers.dart';
import '../shell/dashboard_widgets.dart';

/// Structure API client (sections picker).
final structureApiProvider = Provider<StructureApi>((ref) => StructureApi(ref.watch(dioProvider)));

/// The tenant's sections (teachers hold attendance:create, which grants the list).
final sectionsProvider = FutureProvider<List<SectionSummary>>((ref) async {
  return ref.watch(structureApiProvider).sections();
});

const _statuses = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];
const _statusLabels = {'PRESENT': 'P', 'LATE': 'L', 'ABSENT': 'A', 'EXCUSED': 'E'};

/// Teacher class tab: pick section + date + period, mark the roster, and save through the
/// offline-first queue (optimistic; synced on reconnect; server bulk endpoint is idempotent).
class TeacherClassTab extends ConsumerStatefulWidget {
  const TeacherClassTab({super.key});

  @override
  ConsumerState<TeacherClassTab> createState() => _TeacherClassTabState();
}

class _TeacherClassTabState extends ConsumerState<TeacherClassTab> {
  String? _sectionId;
  DateTime _date = DateTime.now();
  int _period = 1;
  final Map<String, String> _marks = {};
  bool _saving = false;

  String get _dateIso => _date.toIso8601String().substring(0, 10);

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now().subtract(const Duration(days: 60)),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked != null) {
      setState(() {
        _date = picked;
        _marks.clear();
      });
    }
  }

  Future<void> _save() async {
    final sectionId = _sectionId;
    if (sectionId == null || _marks.isEmpty) return;
    setState(() => _saving = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(attendanceControllerProvider.notifier).markMany(
            sectionId: sectionId,
            date: _dateIso,
            periodIndex: _period,
            statusByStudentId: Map.of(_marks),
          );
      final pendingAfter = ref.read(attendanceControllerProvider);
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            pendingAfter == 0
                ? 'Attendance saved (${_marks.length} students).'
                : 'Saved locally — $pendingAfter mark(s) will sync when online.',
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sectionsAsync = ref.watch(sectionsProvider);
    final pending = ref.watch(attendanceControllerProvider);
    final s = ref.watch(stringsProvider);

    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (pending > 0)
            Card(
              color: Theme.of(context).colorScheme.secondaryContainer,
              child: ListTile(
                leading: const Icon(Icons.cloud_off),
                title: Text('$pending mark(s) waiting to sync'),
                trailing: TextButton(
                  onPressed: () => ref.read(attendanceControllerProvider.notifier).sync(),
                  child: Text(s.t('common.syncNow')),
                ),
              ),
            ),
          sectionsAsync.when(
            loading: () => const AsyncSection(loading: true, error: null, child: SizedBox()),
            error: (e, _) => AsyncSection(
              loading: false,
              error: e,
              onRetry: () => ref.invalidate(sectionsProvider),
              child: const SizedBox(),
            ),
            data: (sections) {
              if (sections.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('No sections found for this school.'),
                );
              }
              return DropdownButtonFormField<String>(
                value: _sectionId,
                decoration:
                    const InputDecoration(labelText: 'Section', border: OutlineInputBorder()),
                items: [
                  for (final s in sections)
                    DropdownMenuItem(value: s.id, child: Text('Section ${s.name}')),
                ],
                onChanged: (v) => setState(() {
                  _sectionId = v;
                  _marks.clear();
                }),
              );
            },
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _pickDate,
                  icon: const Icon(Icons.calendar_today, size: 16),
                  label: Text(_dateIso),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButtonFormField<int>(
                  value: _period,
                  decoration:
                      const InputDecoration(labelText: 'Period', border: OutlineInputBorder()),
                  items: [
                    for (var p = 1; p <= 8; p++) DropdownMenuItem(value: p, child: Text('P$p')),
                  ],
                  onChanged: (v) => setState(() {
                    _period = v ?? 1;
                    _marks.clear();
                  }),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_sectionId != null)
            _Roster(
              sectionId: _sectionId!,
              marks: _marks,
              onChanged: (studentId, status) => setState(() => _marks[studentId] = status),
              onMarkAll: (ids) => setState(() {
                for (final id in ids) {
                  _marks[id] = 'PRESENT';
                }
              }),
            )
          else
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text('Pick a section to load its roster.'),
            ),
        ],
      ),
      bottomNavigationBar: _sectionId == null || _marks.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Saving…' : 'Save attendance (${_marks.length})'),
                ),
              ),
            ),
    );
  }
}

class _Roster extends ConsumerWidget {
  const _Roster({
    required this.sectionId,
    required this.marks,
    required this.onChanged,
    required this.onMarkAll,
  });

  final String sectionId;
  final Map<String, String> marks;
  final void Function(String studentId, String status) onChanged;
  final void Function(List<String> studentIds) onMarkAll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rosterAsync = ref.watch(sectionStudentsProvider(sectionId));
    return rosterAsync.when(
      loading: () => const AsyncSection(loading: true, error: null, child: SizedBox()),
      error: (e, _) => AsyncSection(
        loading: false,
        error: e,
        onRetry: () => ref.invalidate(sectionStudentsProvider(sectionId)),
        child: const SizedBox(),
      ),
      data: (students) {
        if (students.isEmpty) {
          return const Padding(
            padding: EdgeInsets.all(24),
            child: Text('No students in this section.'),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${marks.length}/${students.length} marked',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                TextButton(
                  onPressed: () => onMarkAll(students.map((s) => s.id).toList()),
                  child: const Text('Mark all present'),
                ),
              ],
            ),
            for (final s in students)
              Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.fullNameEn, style: Theme.of(context).textTheme.titleSmall),
                      Text(s.fullNameAr, style: Theme.of(context).textTheme.bodySmall),
                      const SizedBox(height: 8),
                      SegmentedButton<String>(
                        showSelectedIcon: false,
                        emptySelectionAllowed: true,
                        segments: [
                          for (final st in _statuses)
                            ButtonSegment(
                              value: st,
                              label: Text(_statusLabels[st]!),
                              tooltip: st,
                            ),
                        ],
                        selected: marks.containsKey(s.id) ? {marks[s.id]!} : <String>{},
                        onSelectionChanged: (sel) {
                          if (sel.isNotEmpty) onChanged(s.id, sel.first);
                        },
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
