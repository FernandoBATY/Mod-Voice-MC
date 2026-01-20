
import 'package:flutter_test/flutter_test.dart';

import 'package:proximity_voice_chat/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const ProximityVoiceChatApp());

    // Verify that the title shows up.
    expect(find.text('Chat de Voz'), findsOneWidget);
    expect(find.text('Minecraft Bedrock'), findsOneWidget);
    
    // Verify that the login button exists
    expect(find.text('Conectar'), findsOneWidget);
  });
}
