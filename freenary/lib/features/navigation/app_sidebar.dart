import 'package:flutter/material.dart';
import 'nav_models.dart';

class AppSidebar extends StatelessWidget {
  final String selectedKey;
  final ValueChanged<String> onSelect;
  final bool collapsed;
  final VoidCallback onToggleCollapse;
  final VoidCallback onToggleTheme;

  const AppSidebar({
    super.key,
    required this.selectedKey,
    required this.onSelect,
    required this.collapsed,
    required this.onToggleCollapse,
    required this.onToggleTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      child: SizedBox(
        width: collapsed ? 72 : 260,
        child: Column(
          children: [
            _Header(collapsed: collapsed, onToggleCollapse: onToggleCollapse),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: [
                  _GroupSection(group: patrimoineGroup, selectedKey: selectedKey, onSelect: onSelect, collapsed: collapsed),
                  _GroupSection(group: outilsGroup, selectedKey: selectedKey, onSelect: onSelect, collapsed: collapsed),
                ],
              ),
            ),
            const Divider(height: 1),
            _Footer(collapsed: collapsed, onToggleTheme: onToggleTheme, onSelectSettings: () => onSelect('settings')),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatefulWidget {
  final bool collapsed;
  final VoidCallback onToggleCollapse;
  const _Header({required this.collapsed, required this.onToggleCollapse});

  @override
  State<_Header> createState() => _HeaderState();
}

class _HeaderState extends State<_Header> {
  bool _hovering = false;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    if (widget.collapsed) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Center(
          child: MouseRegion(
            onEnter: (_) => setState(() => _hovering = true),
            onExit: (_) => setState(() => _hovering = false),
            child: Tooltip(
              message: 'Ouvrir le menu',
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: widget.onToggleCollapse,
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: Icon(
                    _hovering ? Icons.menu : Icons.account_balance,
                    color: scheme.primary,
                    size: 28,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      child: Row(
        children: [
          Icon(Icons.account_balance, color: scheme.primary, size: 28),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Freenary',
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.menu_open),
            tooltip: 'Réduire le menu',
            onPressed: widget.onToggleCollapse,
          ),
        ],
      ),
    );
  }
}

class _GroupSection extends StatelessWidget {
  final NavGroup group;
  final String selectedKey;
  final ValueChanged<String> onSelect;
  final bool collapsed;

  const _GroupSection({
    required this.group,
    required this.selectedKey,
    required this.onSelect,
    required this.collapsed,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!collapsed)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Text(
              group.label.toUpperCase(),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    letterSpacing: 0.8,
                  ),
            ),
          ),
        for (final item in group.items) _NavItemTile(item: item, selectedKey: selectedKey, onSelect: onSelect, collapsed: collapsed),
      ],
    );
  }
}

class _NavItemTile extends StatelessWidget {
  final NavItem item;
  final String selectedKey;
  final ValueChanged<String> onSelect;
  final bool collapsed;

  const _NavItemTile({
    required this.item,
    required this.selectedKey,
    required this.onSelect,
    required this.collapsed,
  });

  bool get _isSelected => selectedKey == item.key || item.children.any((c) => c.key == selectedKey);

  @override
  Widget build(BuildContext context) {
    if (item.children.isEmpty) {
      return _Tile(
        icon: item.icon,
        label: item.label,
        selected: selectedKey == item.key,
        collapsed: collapsed,
        onTap: () => onSelect(item.key),
      );
    }

    if (collapsed) {
      return _Tile(
        icon: item.icon,
        label: item.label,
        selected: _isSelected,
        collapsed: true,
        onTap: () => onSelect(item.children.first.key),
      );
    }

    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        leading: Icon(item.icon),
        title: Text(item.label, overflow: TextOverflow.ellipsis, maxLines: 1),
        initiallyExpanded: _isSelected,
        shape: const Border(),
        childrenPadding: EdgeInsets.zero,
        children: [
          for (final child in item.children)
            Padding(
              padding: const EdgeInsets.only(left: 16),
              child: _Tile(
                icon: child.icon,
                label: child.label,
                selected: selectedKey == child.key,
                collapsed: false,
                onTap: () => onSelect(child.key),
                dense: true,
              ),
            ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final bool collapsed;
  final VoidCallback onTap;
  final bool dense;

  const _Tile({
    required this.icon,
    required this.label,
    required this.selected,
    required this.collapsed,
    required this.onTap,
    this.dense = false,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = selected ? scheme.primaryContainer.withValues(alpha: 0.4) : Colors.transparent;

    if (collapsed) {
      return Tooltip(
        message: label,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Ink(
              color: bg,
              child: InkWell(
                onTap: onTap,
                child: SizedBox(
                height: 48,
                child: Center(
                  child: Icon(icon, color: selected ? scheme.primary : null),
                ),
              ),
              ),
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Ink(
          color: bg,
          child: ListTile(
            dense: dense,
            minLeadingWidth: 0,
            leading: Icon(icon, color: selected ? scheme.primary : null),
            title: Text(
              label,
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              style: TextStyle(
                color: selected ? scheme.primary : null,
                fontWeight: selected ? FontWeight.w600 : null,
              ),
            ),
            onTap: onTap,
          ),
        ),
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  final bool collapsed;
  final VoidCallback onToggleTheme;
  final VoidCallback onSelectSettings;

  const _Footer({required this.collapsed, required this.onToggleTheme, required this.onSelectSettings});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (collapsed) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          children: [
            Tooltip(
              message: 'Compte',
              child: InkWell(
                borderRadius: BorderRadius.circular(24),
                onTap: onSelectSettings,
                child: const Padding(
                  padding: EdgeInsets.all(6),
                  child: CircleAvatar(child: Icon(Icons.person, size: 18)),
                ),
              ),
            ),
            IconButton(
              tooltip: 'Changer le thème',
              icon: Icon(isDark ? Icons.light_mode : Icons.dark_mode),
              onPressed: onToggleTheme,
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(8),
      child: Column(
        children: [
          ListTile(
            minLeadingWidth: 0,
            leading: const CircleAvatar(child: Icon(Icons.person, size: 18)),
            title: const Text('Baptiste', overflow: TextOverflow.ellipsis, maxLines: 1),
            subtitle: const Text('Compte', style: TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis, maxLines: 1),
            trailing: PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (v) {
                if (v == 'settings') onSelectSettings();
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'settings', child: Text('Réglages')),
                PopupMenuItem(value: 'logout', child: Text('Se déconnecter')),
              ],
            ),
          ),
          SwitchListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            title: const Text('Mode sombre', overflow: TextOverflow.ellipsis, maxLines: 1),
            value: isDark,
            onChanged: (_) => onToggleTheme(),
          ),
        ],
      ),
    );
  }
}