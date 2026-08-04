import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';
import 'app/theme.dart';
import 'app/theme_controller.dart';
import 'app/app_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await windowManager.ensureInitialized();

  const windowOptions = WindowOptions(
    size: Size(1440, 900),
    minimumSize: Size(1024, 700),
    center: true,
    title: 'Freenary',
  );

  windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.show();
    await windowManager.focus();
  });

  runApp(const FreenaryApp());
}

class FreenaryApp extends StatefulWidget {
  const FreenaryApp({super.key});

  @override
  State<FreenaryApp> createState() => _FreenaryAppState();
}

class _FreenaryAppState extends State<FreenaryApp> {
  final _themeController = ThemeController();

  @override
  void initState() {
    super.initState();
    _themeController.load();
    _themeController.addListener(() => setState(() {}));
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Freenary',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: _themeController.mode,
      home: AppShell(
        themeController: _themeController,
        pages: {
          'dashboard': (_) => const Center(child: Text('Tableau de bord')),
          'actifs_actions_fonds': (_) => const Center(child: Text('Actions & Fonds')),
          'actifs_startups_pme': (_) => const Center(child: Text('Startups & PME')),
          'actifs_immobilier': (_) => const Center(child: Text('Immobilier')),
          'actifs_crypto': (_) => const Center(child: Text('Crypto')),
          'actifs_metaux_precieux': (_) => const Center(child: Text('Métaux précieux')),
          'actifs_epargne': (_) => const Center(child: Text('Épargne')),
          'actifs_autres': (_) => const Center(child: Text('Autres')),
          'passifs_emprunts': (_) => const Center(child: Text('Emprunts')),
          'passifs_prets_immobiliers': (_) => const Center(child: Text('Prêts immobiliers')),
          'strategie': (_) => const Center(child: Text('Stratégie')),
          'budget': (_) => const Center(child: Text('Budget')),
          'taxation': (_) => const Center(child: Text('Taxation')),
          'simulation': (_) => const Center(child: Text('Simulation')),
          'settings': (_) => const Center(child: Text('Réglages')),
        },
      ),
    );
  }
}