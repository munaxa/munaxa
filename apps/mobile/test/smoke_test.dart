import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:munaxa_mobile/app.dart';
import 'package:munaxa_mobile/core/config/flavor.dart';

void main() {
  testWidgets('App boots and renders the flavor home placeholder', (tester) async {
    AppConfig.init(
      const AppConfig(
        flavor: Flavor.parent,
        appName: 'Munaxa Parent',
        apiBaseUrl: 'http://localhost:4000/api/v1',
      ),
    );

    await tester.pumpWidget(ProviderScope(child: MunaxaApp()));
    await tester.pumpAndSettle();

    expect(find.text('Munaxa Parent'), findsOneWidget);
    expect(find.text('Flavor: parent'), findsOneWidget);
  });
}
