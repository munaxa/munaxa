import 'package:dio/dio.dart';

/// A resolved class period (master slot with any exception applied).
class ResolvedPeriod {
  const ResolvedPeriod({
    required this.periodIndex,
    required this.startTime,
    required this.endTime,
    required this.subject,
    required this.status,
    this.note,
  });

  final int periodIndex;
  final String startTime;
  final String endTime;
  final String subject;
  final String status; // SCHEDULED | CANCELLED | SUBSTITUTED | REPLACED
  final String? note;

  factory ResolvedPeriod.fromJson(Map<String, dynamic> json) {
    return ResolvedPeriod(
      periodIndex: (json['periodIndex'] as num).toInt(),
      startTime: json['startTime'] as String,
      endTime: json['endTime'] as String,
      subject: json['subject'] as String,
      status: json['status'] as String,
      note: json['note'] as String?,
    );
  }
}

/// The current/next class resolution for a section.
class CurrentClass {
  const CurrentClass({
    required this.scheduleType,
    required this.isHoliday,
    this.current,
    this.next,
  });

  final String scheduleType; // REGULAR | RAMADAN
  final bool isHoliday;
  final ResolvedPeriod? current;
  final ResolvedPeriod? next;

  factory CurrentClass.fromJson(Map<String, dynamic> json) {
    return CurrentClass(
      scheduleType: json['scheduleType'] as String,
      isHoliday: json['isHoliday'] as bool? ?? false,
      current: json['current'] == null
          ? null
          : ResolvedPeriod.fromJson(json['current'] as Map<String, dynamic>),
      next: json['next'] == null
          ? null
          : ResolvedPeriod.fromJson(json['next'] as Map<String, dynamic>),
    );
  }
}

/// Timetable read access for mobile clients (Teacher/Student/Parent apps).
class TimetableApi {
  TimetableApi(this._dio);

  final Dio _dio;

  Future<CurrentClass> currentClass(String sectionId, {DateTime? at}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/timetable/sections/$sectionId/current',
      queryParameters: {if (at != null) 'at': at.toUtc().toIso8601String()},
    );
    return CurrentClass.fromJson(res.data!);
  }

  Future<List<ResolvedPeriod>> day(String sectionId, DateTime date) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/timetable/sections/$sectionId/day',
      queryParameters: {'date': date.toIso8601String().substring(0, 10)},
    );
    return ((res.data?['periods'] as List<dynamic>?) ?? [])
        .cast<Map<String, dynamic>>()
        .map(ResolvedPeriod.fromJson)
        .toList();
  }
}
