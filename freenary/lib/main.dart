import 'package:shadcn_flutter/shadcn_flutter.dart';
import 'package:window_manager/window_manager.dart';
import 'core/storage/vault_folder_service.dart';
import 'core/profiles/profile_controller.dart';
import 'core/profiles/profile_repository.dart';
import 'core/profiles/sidebar_prefs_controller.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/settings/account_management_screen.dart';
import 'app/theme_controller.dart';
import 'app/app_shell.dart';
import 'features/strategy/strategy_screen.dart';
import 'package:flutter_quill/flutter_quill.dart' show FlutterQuillLocalizations;
import 'features/budget/budget_screen.dart';
import 'features/simulations/simulations_taxation_screen.dart';
import 'features/simulations/simulations_wealth_screen.dart';
import 'features/simulations/simulations_loan_screen.dart';

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
  final _vaultFolderService = VaultFolderService();

  bool _checkingVault = true;
  String? _vaultPath;
  ProfileController? _profileController;
  SidebarPrefsController? _sidebarPrefsController;

  @override
  void initState() {
    super.initState();
    _themeController.load();
    _themeController.addListener(() => setState(() {}));
    _loadVault();
  }

  Future<void> _loadVault() async {
    final path = await _vaultFolderService.getSavedVaultPath();
    setState(() {
      _vaultPath = path;
      _checkingVault = false;
    });
    if (path != null) await _initProfiles(path);
  }

  Future<void> _initProfiles(String vaultPath) async {
    final controller = ProfileController(ProfileRepository(vaultPath));
    await controller.load();
    controller.addListener(() => setState(() {}));
    final sidebarPrefs = SidebarPrefsController(controller);
    setState(() {
      _profileController = controller;
      _sidebarPrefsController = sidebarPrefs;
    });
  }

  void _onVaultReady(String path) {
    setState(() => _vaultPath = path);
    _initProfiles(path);
  }

  void _resetVault() {
    setState(() {
      _vaultPath = null;
      _profileController = null;
      _sidebarPrefsController = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ShadcnApp(
      title: 'Freenary',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: LegacyColorSchemes.lightZinc().recolor(const Color(0xFFF4BE7E)),
        radius: 0.6,
      ),
      darkTheme: ThemeData(
        colorScheme: LegacyColorSchemes.darkZinc().recolor(const Color(0xFFF4BE7E)),
        radius: 0.6,
      ),
      themeMode: _themeController.mode,
      home: _buildHome(),
      localizationsDelegates: FlutterQuillLocalizations.localizationsDelegates,
    );
  }

  Widget _buildHome() {
    if (_checkingVault) {
      return const Scaffold(
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_vaultPath == null) {
      return OnboardingScreen(
        vaultFolderService: _vaultFolderService,
        onVaultReady: _onVaultReady,
      );
    }
    if (_profileController == null || _sidebarPrefsController == null) {
      return const Scaffold(
        child: Center(child: CircularProgressIndicator()),
      );
    }
    return AppShell(
      themeController: _themeController,
      profileController: _profileController!,
      sidebarPrefsController: _sidebarPrefsController!,
      pages: {
        'dashboard': (_) => const Center(child: Text('Tableau de bord')),
        'actifs_actions_fonds': (_) => const Center(child: Text('Actions & Fonds')),
        'actifs_private_equity': (_) => const Center(child: Text('Private Equity')),
        'actifs_immobilier': (_) => const Center(child: Text('Immobilier')),
        'actifs_crypto': (_) => const Center(child: Text('Crypto')),
        'actifs_metaux_precieux': (_) => const Center(child: Text('Métaux précieux')),
        'actifs_epargne': (_) => const Center(child: Text('Épargne')),
        'actifs_autres': (_) => const Center(child: Text('Autres')),
        'passifs_emprunts': (_) => const Center(child: Text('Emprunts')),
        'passifs_prets_immobiliers': (_) => const Center(child: Text('Prêts immobiliers')),
        'strategie': (_) => StrategyScreen(vaultPath: _profileController!.activeDataPath),
        'budget': (_) => BudgetScreen(vaultPath: _profileController!.activeDataPath),
        'simulation_taxation': (_) => const TaxationSimulationScreen(),
        'simulation_patrimoine': (_) => const WealthSimulationScreen(),
        'simulation_pret': (_) => const LoanSimulationScreen(),
        'account_management': (_) => AccountManagementScreen(profileController: _profileController!),
        'settings': (_) => SettingsScreen(
              vaultFolderService: _vaultFolderService,
              currentVaultPath: _vaultPath!,
              onVaultChanged: _onVaultReady,
              onVaultReset: _resetVault,
              themeController: _themeController,
              profileController: _profileController!,
              sidebarPrefsController: _sidebarPrefsController!,
            ),
      },
    );
  }
}