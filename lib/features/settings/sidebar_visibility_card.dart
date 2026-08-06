import 'package:shadcn_flutter/shadcn_flutter.dart' hide Text, Colors;
import 'package:flutter/material.dart' show Colors;
import 'package:shadcn_flutter/shadcn_flutter.dart' as shadcn show Text;
import '../../core/profiles/profile_controller.dart';
import '../../core/profiles/sidebar_prefs_controller.dart';
import '../../core/ui/frosted_card.dart';

/// Clés et libellés des postes Actifs/Passifs — doivent correspondre
/// exactement aux clés de nav_models.dart.
const List<(String key, String label)> _actifsItems = [
  ('actifs_actions_fonds', 'Actions & Fonds'),
  ('actifs_private_equity', 'Private Equity'),
  ('actifs_immobilier', 'Immobilier'),
  ('actifs_crypto', 'Crypto'),
  ('actifs_metaux_precieux', 'Métaux précieux'),
  ('actifs_epargne', 'Épargne'),
  ('actifs_autres', 'Autres'),
];

const List<(String key, String label)> _passifsItems = [
  ('passifs_emprunts', 'Emprunts'),
  ('passifs_prets_immobiliers', 'Prêts immobiliers'),
];

class SidebarVisibilityCard extends StatelessWidget {
  final ProfileController profileController;
  final SidebarPrefsController sidebarPrefsController;

  const SidebarVisibilityCard({
    super.key,
    required this.profileController,
    required this.sidebarPrefsController,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([profileController, sidebarPrefsController]),
      builder: (context, _) {
        final profileId = profileController.active?.id;
        if (profileId == null) return const SizedBox.shrink();

        sidebarPrefsController.loadFor(profileId);
        final hidden = sidebarPrefsController.hiddenKeysFor(profileId);

        return FrostedCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const shadcn.Text('Postes affichés dans la sidebar').large().medium(),
                const SizedBox(height: 4),
                const shadcn.Text(
                  "Propre à ce compte : choisis les catégories d'actifs et de passifs à afficher dans la navigation.",
                ).muted().small(),
                const SizedBox(height: 16),
                shadcn.Text('Actifs').semiBold().small(),
                const SizedBox(height: 8),
                for (final (key, label) in _actifsItems)
                  _ToggleRow(
                    label: label,
                    value: !hidden.contains(key),
                    onChanged: (visible) => sidebarPrefsController.setHidden(profileId, key, !visible),
                  ),
                const SizedBox(height: 16),
                shadcn.Text('Passifs').semiBold().small(),
                const SizedBox(height: 8),
                for (final (key, label) in _passifsItems)
                  _ToggleRow(
                    label: label,
                    value: !hidden.contains(key),
                    onChanged: (visible) => sidebarPrefsController.setHidden(profileId, key, !visible),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ToggleRow extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  const _ToggleRow({required this.label, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(child: shadcn.Text(label)),
          _SimpleSwitch(value: value, onChanged: onChanged),
        ],
      ),
    );
  }
}

class _SimpleSwitch extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;
  const _SimpleSwitch({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    final track = Theme.of(context).colorScheme.border;
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 40,
        height: 22,
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: value ? accent : track,
          borderRadius: BorderRadius.circular(11),
        ),
        child: AnimatedAlign(
          duration: const Duration(milliseconds: 150),
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            width: 18,
            height: 18,
            decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
          ),
        ),
      ),
    );
  }
}