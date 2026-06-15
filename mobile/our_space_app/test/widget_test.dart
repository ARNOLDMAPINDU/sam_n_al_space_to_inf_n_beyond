import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:our_space_app/main.dart';

void main() {
  testWidgets('App starts and shows a loading indicator', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const OurSpaceApp());
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
