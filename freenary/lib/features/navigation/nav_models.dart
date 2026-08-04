import 'package:flutter/material.dart';

class NavItem {
  final String key;
  final String label;
  final IconData icon;
  final List<NavItem> children;

  const NavItem({
    required this.key,
    required this.label,
    required this.icon,
    this.children = const [],
  });
}

class NavGroup {
  final String label;
  final List<NavItem> items;

  const NavGroup({required this.label, required this.items});
}

const patrimoineGroup = NavGroup(
  label: 'Patrimoine',
  items: [
    NavItem(key: 'dashboard', label: 'Tableau de bord', icon: Icons.dashboard_outlined),
    NavItem(
      key: 'actifs',
      label: 'Actifs',
      icon: Icons.add_circle_outline,
      children: [
        NavItem(key: 'actifs_actions_fonds', label: 'Actions & Fonds', icon: Icons.show_chart),
        NavItem(key: 'actifs_startups_pme', label: 'Startups & PME', icon: Icons.rocket_launch_outlined),
        NavItem(key: 'actifs_immobilier', label: 'Immobilier', icon: Icons.home_outlined),
        NavItem(key: 'actifs_crypto', label: 'Crypto', icon: Icons.currency_bitcoin),
        NavItem(key: 'actifs_metaux_precieux', label: 'Métaux précieux', icon: Icons.diamond_outlined),
        NavItem(key: 'actifs_epargne', label: 'Épargne', icon: Icons.savings_outlined),
        NavItem(key: 'actifs_autres', label: 'Autres', icon: Icons.category_outlined),
      ],
    ),
    NavItem(
      key: 'passifs',
      label: 'Passifs',
      icon: Icons.remove_circle_outline,
      children: [
        NavItem(key: 'passifs_emprunts', label: 'Emprunts', icon: Icons.request_quote_outlined),
        NavItem(key: 'passifs_prets_immobiliers', label: 'Prêts immobiliers', icon: Icons.house_outlined),
      ],
    ),
  ],
);

const outilsGroup = NavGroup(
  label: 'Outils',
  items: [
    NavItem(key: 'strategie', label: 'Stratégie', icon: Icons.edit_note_outlined),
    NavItem(key: 'budget', label: 'Budget', icon: Icons.account_balance_wallet_outlined),
    NavItem(key: 'taxation', label: 'Taxation', icon: Icons.local_fire_department_outlined),
    NavItem(key: 'simulation', label: 'Simulation', icon: Icons.show_chart),
  ],
);