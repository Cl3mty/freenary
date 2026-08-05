import 'package:shadcn_flutter/shadcn_flutter.dart' hide Text;
import 'package:shadcn_flutter/shadcn_flutter.dart' as shadcn show Text;
import 'budget_models.dart';
import 'budget_repository.dart';
import 'budget_sankey.dart';

class BudgetScreen extends StatefulWidget {
  final String vaultPath;
  const BudgetScreen({super.key, required this.vaultPath});

  @override
  State<BudgetScreen> createState() => _BudgetScreenState();
}

class _BudgetScreenState extends State<BudgetScreen> {
  late final BudgetRepository _repo = BudgetRepository(widget.vaultPath);
  BudgetData _data = BudgetData.empty();
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await _repo.loadLatest();
    setState(() {
      _data = data;
      _loading = false;
    });
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await _repo.save(_data);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _formatEuros(double value) => '${value.round()}';

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SummaryRow(data: _data, formatEuros: _formatEuros),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _RevenuesCard(
                      revenues: _data.revenues,
                      formatEuros: _formatEuros,
                      onChanged: (revenues) => setState(() => _data = _data.copyWith(revenues: revenues)),
                    ),
                    const SizedBox(height: 24),
                    _CategoriesCard(
                      title: 'Dépenses',
                      totalColor: const Color(0xFFEF4444),
                      total: _data.totalExpenses,
                      categories: _data.expenseCategories,
                      itemIdPrefix: 'expense',
                      formatEuros: _formatEuros,
                      onChanged: (cats) => setState(() => _data = _data.copyWith(expenseCategories: cats)),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: _CategoriesCard(
                  title: 'Investissements',
                  totalColor: Theme.of(context).colorScheme.primary,
                  total: _data.totalInvestments,
                  categories: _data.investmentCategories,
                  itemIdPrefix: 'investment',
                  formatEuros: _formatEuros,
                  onChanged: (cats) => setState(() => _data = _data.copyWith(investmentCategories: cats)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                        Expanded(child: const shadcn.Text('Flux budgétaire').large().medium()),                      OutlineButton(
                        onPressed: _saving ? null : _save,
                        leading: const Icon(LucideIcons.save),
                        child: shadcn.Text(_saving ? 'Sauvegarde...' : 'Sauvegarder'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  BudgetSankeyChart(data: _data),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final BudgetData data;
  final String Function(double) formatEuros;
  const _SummaryRow({required this.data, required this.formatEuros});

  @override
  Widget build(BuildContext context) {
    Widget card(String label, double value, Color color) {
      return Expanded(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                shadcn.Text(label).muted().small(),
                const SizedBox(height: 4),
                shadcn.Text('${formatEuros(value)}€', style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ),
      );
    }

    return Row(
      children: [
        card('Revenus', data.totalRevenues, const Color(0xFF22C55E)),
        const SizedBox(width: 16),
        card('Dépenses', data.totalExpenses, const Color(0xFFEF4444)),
        const SizedBox(width: 16),
        card('Investissements', data.totalInvestments, Theme.of(context).colorScheme.primary),
        const SizedBox(width: 16),
        card('Solde', data.balance, data.balance >= 0 ? Theme.of(context).colorScheme.foreground : const Color(0xFFEF4444)),
      ],
    );
  }
}

class _RevenuesCard extends StatelessWidget {
  final List<BudgetItem> revenues;
  final ValueChanged<List<BudgetItem>> onChanged;
  final String Function(double) formatEuros;

  const _RevenuesCard({
    required this.revenues,
    required this.onChanged,
    required this.formatEuros,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: const shadcn.Text('Revenus').large().medium()),
                shadcn.Text(
                  '${formatEuros(revenues.fold<double>(0, (s, r) => s + r.amount))}€',
                  style: const TextStyle(color: Color(0xFF22C55E), fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            for (final revenue in revenues)
              Padding(
                key: ValueKey(revenue.id),
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        initialValue: revenue.name,
                        placeholder: const shadcn.Text('Nom du revenu'),
                        onChanged: (value) {
                          onChanged([
                            for (final r in revenues)
                              if (r.id == revenue.id) r.copyWith(name: value) else r,
                          ]);
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 100,
                      child: TextField(
                        initialValue: revenue.amount == 0 ? '' : revenue.amount.toStringAsFixed(0),
                        placeholder: const shadcn.Text('Montant'),
                        keyboardType: TextInputType.number,
                        onChanged: (value) {
                          final amount = double.tryParse(value) ?? 0;
                          onChanged([
                            for (final r in revenues)
                              if (r.id == revenue.id) r.copyWith(amount: amount) else r,
                          ]);
                        },
                      ),
                    ),
                    IconButton.ghost(
                      icon: const Icon(LucideIcons.trash2, size: 16),
                      onPressed: () => onChanged(revenues.where((r) => r.id != revenue.id).toList()),
                    ),
                  ],
                ),
              ),
            OutlineButton(
              onPressed: () => onChanged([
                ...revenues,
                BudgetItem(id: generateItemId('revenue'), name: '', amount: 0),
              ]),
              leading: const Icon(LucideIcons.plus),
              child: const shadcn.Text('Ajouter une source de revenu'),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoriesCard extends StatelessWidget {
  final String title;
  final Color totalColor;
  final double total;
  final List<BudgetCategory> categories;
  final String itemIdPrefix;
  final ValueChanged<List<BudgetCategory>> onChanged;
  final String Function(double) formatEuros;

  const _CategoriesCard({
    required this.title,
    required this.totalColor,
    required this.total,
    required this.categories,
    required this.itemIdPrefix,
    required this.onChanged,
    required this.formatEuros,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: shadcn.Text(title).large().medium()),
                shadcn.Text('${formatEuros(total)}€', style: TextStyle(color: totalColor, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 12),
            for (var catIdx = 0; catIdx < categories.length; catIdx++)
              Container(
                key: ValueKey('${itemIdPrefix}_cat_$catIdx'),
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: Theme.of(context).colorScheme.border),
                  borderRadius: BorderRadius.circular(Theme.of(context).radiusMd),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            initialValue: categories[catIdx].name,
                            placeholder: const shadcn.Text('Catégorie'),
                            onChanged: (value) {
                              final updated = [...categories];
                              updated[catIdx] = updated[catIdx].copyWith(name: value);
                              onChanged(updated);
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        shadcn.Text(
                          '${formatEuros(categories[catIdx].items.fold<double>(0, (s, i) => s + i.amount))}€',
                        ).medium(),
                      ],
                    ),
                    const SizedBox(height: 8),
                    for (final item in categories[catIdx].items)
                      Padding(
                        key: ValueKey(item.id),
                        padding: const EdgeInsets.only(bottom: 6, left: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                initialValue: item.name,
                                placeholder: const shadcn.Text('Nom'),
                                onChanged: (value) {
                                  final updated = [...categories];
                                  updated[catIdx] = updated[catIdx].copyWith(items: [
                                    for (final i in updated[catIdx].items)
                                      if (i.id == item.id) i.copyWith(name: value) else i,
                                  ]);
                                  onChanged(updated);
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            SizedBox(
                              width: 90,
                              child: TextField(
                                initialValue: item.amount == 0 ? '' : item.amount.toStringAsFixed(0),
                                placeholder: const shadcn.Text('Montant'),
                                keyboardType: TextInputType.number,
                                onChanged: (value) {
                                  final amount = double.tryParse(value) ?? 0;
                                  final updated = [...categories];
                                  updated[catIdx] = updated[catIdx].copyWith(items: [
                                    for (final i in updated[catIdx].items)
                                      if (i.id == item.id) i.copyWith(amount: amount) else i,
                                  ]);
                                  onChanged(updated);
                                },
                              ),
                            ),
                            IconButton.ghost(
                              icon: const Icon(LucideIcons.trash2, size: 14),
                              onPressed: () {
                                final updated = [...categories];
                                updated[catIdx] = updated[catIdx].copyWith(
                                  items: updated[catIdx].items.where((i) => i.id != item.id).toList(),
                                );
                                onChanged(updated);
                              },
                            ),
                          ],
                        ),
                      ),
                    OutlineButton(
                      onPressed: () {
                        final updated = [...categories];
                        updated[catIdx] = updated[catIdx].copyWith(items: [
                          ...updated[catIdx].items,
                          BudgetItem(id: generateItemId(itemIdPrefix), name: '', amount: 0),
                        ]);
                        onChanged(updated);
                      },
                      leading: const Icon(LucideIcons.plus, size: 14),
                      child: const shadcn.Text('Ajouter'),
                    ),
                  ],
                ),
              ),
            OutlineButton(
              onPressed: () => onChanged([...categories, BudgetCategory(name: '', items: [])]),
              leading: const Icon(LucideIcons.plus),
              child: const shadcn.Text('Ajouter une catégorie'),
            ),
          ],
        ),
      ),
    );
  }
}