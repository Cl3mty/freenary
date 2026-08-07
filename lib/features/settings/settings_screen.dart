import 'package:shadcn_flutter/shadcn_flutter.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../app/theme_controller.dart';
import '../../core/storage/vault_folder_service.dart';
import '../../core/updates/update_checker.dart';
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
  final String githubOwner;
  final String githubRepo;

  const SettingsScreen({
    super.key,
    required this.vaultFolderService,
    required this.currentVaultPath,
    required this.onVaultChanged,
    required this.onVaultReset,
    required this.themeController,
    required this.profileController,
    required this.sidebarPrefsController,
    required this.githubOwner,
    required this.githubRepo,
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
            _VersionCard(githubOwner: githubOwner, githubRepo: githubRepo),
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

class _VersionCard extends StatefulWidget {
  final String githubOwner;
  final String githubRepo;

  const _VersionCard({required this.githubOwner, required this.githubRepo});

  @override
  State<_VersionCard> createState() => _VersionCardState();
}

class _VersionCardState extends State<_VersionCard> {
  bool _loading = true;
  String? _error;
  String _currentVersion = '-';
  UpdateInfo? _update;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final checker = UpdateChecker(
        githubOwner: widget.githubOwner,
        githubRepo: widget.githubRepo,
      );
      final update = await checker.checkForUpdate();
      if (!mounted) return;
      setState(() {
        _currentVersion = packageInfo.version;
        _update = update;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Impossible de vérifier la version : $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _downloadAndInstall() async {
    if (_update == null) return;
    final uri = Uri.parse(_update!.downloadUrl);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _openReleaseNotes() async {
    if (_update == null || _update!.releaseNotesUrl.isEmpty) return;
    final uri = Uri.parse(_update!.releaseNotesUrl);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    final muted = Theme.of(context).colorScheme.mutedForeground;

    return FrostedCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Version et mises à jour').large().medium(),
            const SizedBox(height: 8),
            Text('Version installée : $_currentVersion').muted(),
            const SizedBox(height: 12),
            if (_loading)
              Row(
                children: [
                  const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                  const SizedBox(width: 10),
                  const Text('Vérification des releases GitHub...').muted(),
                ],
              )
            else if (_error != null)
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.destructive))
            else if (_update != null) ...[
              Text(
                'Nouvelle version détectée : ${_update!.latestVersion}',
                style: TextStyle(color: accent, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  PrimaryButton(
                    onPressed: _downloadAndInstall,
                    leading: const Icon(LucideIcons.download),
                    child: const Text('Télécharger et installer'),
                  ),
                  const SizedBox(width: 8),
                  OutlineButton(
                    onPressed: _openReleaseNotes,
                    leading: const Icon(LucideIcons.externalLink),
                    child: const Text('Voir la release'),
                  ),
                ],
              ),
            ] else
              Row(
                children: [
                  Icon(LucideIcons.circleCheckBig, size: 16, color: accent),
                  const SizedBox(width: 8),
                  Text('Vous êtes à jour.', style: TextStyle(color: muted)),
                ],
              ),
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
  double _progress = 0;
  int _copiedCount = 0;
  int _totalCount = 0;

  Future<void> _changeFolder() async {
    setState(() {
      _loading = true;
      _error = null;
      _progress = 0;
      _copiedCount = 0;
      _totalCount = 0;
    });
    try {
      final path = await widget.vaultFolderService.pickAndCreateVaultFolder(
        dialogTitle: 'Choisis le nouvel emplacement des données Freenary',
        currentVaultPath: widget.currentVaultPath,
        onMigrationProgress: (copied, total) {
          if (!mounted) return;
          setState(() {
            _copiedCount = copied;
            _totalCount = total;
            _progress = total > 0 ? (copied / total * 100) : 100;
          });
        },
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
              child: Text(_loading ? 'Migration en cours...' : "Modifier l'emplacement"),
            ),
            if (_loading && _totalCount > 0) ...[
              const SizedBox(height: 16),
              Progress(
                progress: _progress.clamp(0, 100),
                min: 0,
                max: 100,
              ),
              const SizedBox(height: 6),
              Text('$_copiedCount / $_totalCount fichiers copiés').muted().small(),
            ],
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