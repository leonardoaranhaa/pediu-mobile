import 'package:flutter/material.dart';

import 'core/app_state.dart';
import 'core/theme.dart';
import 'ui/app_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PediuApp());
}

class PediuApp extends StatefulWidget {
  const PediuApp({super.key});

  @override
  State<PediuApp> createState() => _PediuAppState();
}

class _PediuAppState extends State<PediuApp> {
  final state = AppState();
  late final Future<void> startup = state.init();

  @override
  Widget build(BuildContext context) => FutureBuilder<void>(
        future: startup,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return MaterialApp(
              theme: buildPediuTheme(),
              home: const Scaffold(
                body: Center(child: CircularProgressIndicator()),
              ),
            );
          }
          return AnimatedBuilder(
            animation: state,
            builder: (context, _) => MaterialApp(
              title: 'Pediu',
              debugShowCheckedModeBanner: false,
              theme: buildPediuTheme(),
              home: AppShell(state: state),
            ),
          );
        },
      );

  @override
  void dispose() {
    state.dispose();
    super.dispose();
  }
}
