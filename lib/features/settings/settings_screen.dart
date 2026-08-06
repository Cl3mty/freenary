import 'package:shadcn_flutter/shadcn_flutter.dart';
import '../../app/theme_controller.dart';
import '../../core/storage/vault_folder_service.dart';
import '../../core/ui/frosted_card.dart';
import '../../core/profiles/profile_controller.dart';
import '../../core/profiles/sidebar_prefs_controller.dart';
import 'sidebar_visibility_card.dart';

class SettingsScreen extends StatelessWidget {
  final VaultFolderService vaultFolderService;
  final String currentVaultPath;
  final ValueChanged<String> onVaultChanged;
  final VoidCallback onVaultReset;
  final ThemeController themeController;
  final ProfileController profileController;
  final SidebarPrefsController sidebarPrefsController;

  const SettingsScreen({
    super.key,
    required this.vaultFolderService,
    required this.currentVaultPath,
    required this.onVaultChanged,
    required this.onVaultReset,
    required this.themeController,
    required this.profileController,
    required this.sidebarPrefsController,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 640),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Réglages').large().medium(),
            const SizedBox(height: 24),
            _ThemeCard(themeController: themeController),
            const SizedBox(height: 16),
            SidebarVisibilityCard(
              profileController: profileController,
              sidebarPrefsController: sidebarPrefsController,
            ),
            const SizedBox(height: 16),
            _VaultCard(
              vaultFolderService: vaultFolderService,
              currentVaultPath: currentVaultPath,
              onVaultChanged: onVaultChanged,
            ),
            const SizedBox(height: 16),
            _DebugCard(vaultFolderService: vaultFolderService, onVaultReset: onVaultReset),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _ThemeCard extends StatelessWidget {
  final ThemeController themeController;
  const _ThemeCard({required this.themeController});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: themeController,
      builder: (context, _) {
        final mode = themeController.mode;
        return FrostedCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Apparence').large().medium(),
                const SizedBox(height: 12),
                ButtonGroup(
                  children: [
                    SelectedButton(
                      value: mode == ThemeMode.light,
                      onChanged: (_) => themeController.setMode(ThemeMode.light),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [Icon(LucideIcons.sun), SizedBox(width: 8), Text('Clair')],
                      ),
                    ),
                    SelectedButton(
                      value: mode == ThemeMode.dark,
                      onChanged: (_) => themeController.setMode(ThemeMode.dark),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [Icon(LucideIcons.moon), SizedBox(width: 8), Text('Sombre')],
                      ),
                    ),
                    SelectedButton(
                      value: mode == ThemeMode.system,
                      onChanged: (_) => themeController.setMode(ThemeMode.system),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [Icon(LucideIcons.monitor), SizedBox(width: 8), Text('Système')],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _VaultCard extends StatefulWidget {
  final VaultFolderService vaultFolderService;
  final String currentVaultPath;
  final ValueChanged<String> onVaultChanged;

  const _VaultCard({
    required this.vaultFolderService,
    required this.currentVaultPath,
    required this.onVaultChanged,
  });

  @override
  State<_VaultCard> createState() => _VaultCardState();
}

class _VaultCardState extends State<_VaultCard> {
  bool _loading = false;
  String? _error;

  Future<void> _changeFolder() async {
    setState(() { _loading = true; _error = null; });
    try {
      final path = await widget.vaultFolderService.pickAndCreateVaultFolder(
        dialogTitle: 'Choisis le nouvel emplacement des données Freenary',
      );
      if (path != null) {
        widget.onVaultChanged(path);
      } else {
        setState(() => _error = 'Sélection annulée ou chemin invalide (result == null)');
      }
    } catch (e) {
      setState(() => _error = 'Impossible de changer d\'emplacement : $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FrostedCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Emplacement des données').large().medium(),
            const SizedBox(height: 8),
            Text(widget.currentVaultPath, style: const TextStyle(fontFamily: 'monospace')).muted(),
            const SizedBox(height: 16),
            OutlineButton(
              onPressed: _loading ? null : _changeFolder,
              leading: const Icon(LucideIcons.folderOpen),
              child: Text(_loading ? 'Changement...' : "Modifier l'emplacement"),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.destructive)),
            ],
          ],
        ),
      ),
    );
  }
}

class _DebugCard extends StatelessWidget {
  final VaultFolderService vaultFolderService;
  final VoidCallback onVaultReset;

  const _DebugCard({required this.vaultFolderService, required this.onVaultReset});

  Future<void> _resetOnboarding() async {
    await vaultFolderService.clearSavedVaultPath();
    onVaultReset();
  }

  @override
  Widget build(BuildContext context) {
    final destructive = Theme.of(context).colorScheme.destructive;
    return Container(
      decoration: BoxDecoration(
        color: destructive.scaleAlpha(0.08),
        borderRadius: BorderRadius.circular(Theme.of(context).radiusMd),
        border: Border.all(color: destructive.scaleAlpha(0.3)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Debug').large().medium(),
          const SizedBox(height: 4),
          const Text(
            'Réinitialise le chemin sauvegardé pour retester le premier démarrage. Ne supprime pas les fichiers .freenary existants.',
          ).muted(),
          const SizedBox(height: 16),
          OutlineButton(
            onPressed: _resetOnboarding,
            leading: Icon(LucideIcons.refreshCw, color: destructive),
            child: Text('Simuler le premier démarrage', style: TextStyle(color: destructive)),
          ),
        ],
      ),
    );
  }
}