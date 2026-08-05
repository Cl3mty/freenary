import 'package:shadcn_flutter/shadcn_flutter.dart';
import 'nav_models.dart';

class AppSidebar extends StatelessWidget {
  final String selectedKey;
  final ValueChanged<String> onSelect;
  final bool collapsed;
  final VoidCallback onToggleCollapse;

  const AppSidebar({
    super.key,
    required this.selectedKey,
    required this.onSelect,
    required this.collapsed,
    required this.onToggleCollapse,
  });

  Widget _buildItem(NavItem item) {
    return NavigationItem(
      label: Text(item.label),
      selectedStyle: const ButtonStyle.primaryIcon(),
      selected: selectedKey == item.key,
      onChanged: (isSelected) {
        if (isSelected) onSelect(item.key);
      },
      child: Icon(item.icon),
    );
  }

  Widget _buildGroup(NavGroup group) {
    return NavigationGroup(
      labelAlignment: Alignment.centerLeft,
      label: Text(group.label).semiBold.muted.xSmall,
      children: [
        for (final item in group.items)
          if (item.children.isEmpty)
            _buildItem(item)
          else
            NavigationCollapsible(
              leading: Icon(item.icon),
              label: Text(item.label),
              children: [for (final child in item.children) _buildItem(child)],
            ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return NavigationRail(
      backgroundColor: theme.colorScheme.card,
      labelType: NavigationLabelType.expanded,
      labelPosition: NavigationLabelPosition.end,
      alignment: NavigationRailAlignment.start,
      expandedSize: 260,
      expanded: !collapsed,
      header: [
        NavigationSlot(
          leading: IconContainer(
            backgroundColor: theme.colorScheme.primary,
            icon: const Icon(LucideIcons.landmark).iconMedium,
          ),
          title: const Text('Freenary').medium.small,
          trailing: Icon(
            collapsed ? LucideIcons.panelLeftOpen : LucideIcons.panelLeftClose,
          ).iconSmall,
          onPressed: onToggleCollapse,
        ),
      ],
      footer: [
        NavigationSlot(
          leading: const Avatar(size: 32, initials: 'BP'),
          title: const Text('Baptiste').medium.small,
          subtitle: const Text('Compte').xSmall.normal,
          trailing: const Icon(LucideIcons.chevronsUpDown).iconSmall,
          onPressed: () => onSelect('settings'),
        ),
      ],
      children: [
        _buildGroup(patrimoineGroup),
        const NavigationDivider(),
        _buildGroup(outilsGroup),
      ],
    );
  }
}