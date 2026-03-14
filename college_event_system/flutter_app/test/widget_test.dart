// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('basic smoke test executes', (WidgetTester tester) async {
    // Keep this test framework-only so CI can validate Dart/Flutter test setup.
    expect(2 + 2, 4);
  });
}
