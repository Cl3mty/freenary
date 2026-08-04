import 'package:flutter/material.dart';
import '../features/navigation/app_sidebar.dart';
import 'theme_controller.dart';

const _breakpoint = 800.0;

class AppShell extends StatefulWidget {
  final ThemeController themeController;
  final Map<String, WidgetBuilder> pages;

  const AppShell({super.key, required this.themeController, required this.pages});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  String _selectedKey = 'dashboard';
  bool _collapsed = false;

  void _select(String key) {
    setState(() => _selectedKey = key);
    if (MediaQuery.of(context).size.width < _breakpoint) {
      Navigator.of(context).maybePop(); // ferme le drawer sur mobile/étroit
    }
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= _breakpoint;
    final page = widget.pages[_selectedKey]?.call(context) ??
        const Center(child: Text('Page introuvable'));

    final sidebar = AppSidebar(
      selectedKey: _selectedKey,
      onSelect: _select,
      collapsed: isWide && _collapsed,
      onToggleCollapse: () => setState(() => _collapsed = !_collapsed),
      onToggleTheme: widget.themeController.toggleLightDark,
    );

    if (isWide) {
      return Scaffold(
        body: Row(
          children: [
            sidebar,
            const VerticalDivider(width: 1),
            Expanded(child: page),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Freenary')),
      drawer: Drawer(child: sidebar),
      body: page,
    );
  }
}