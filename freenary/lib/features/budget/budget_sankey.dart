import 'package:flutter/material.dart' show Colors;
import 'package:sankey_flutter/sankey_helpers.dart';
import 'package:sankey_flutter/sankey_node.dart';
import 'package:sankey_flutter/sankey_link.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart' hide Colors;
import 'budget_models.dart';

class BudgetSankeyChart extends StatelessWidget {
  final BudgetData data;
  const BudgetSankeyChart({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final totalRevenues = data.totalRevenues;
    final totalExpenses = data.totalExpenses;
    final totalInvestments = data.totalInvestments;

    if (totalRevenues == 0 && totalExpenses == 0 && totalInvestments == 0) {
      return const SizedBox(
        height: 280,
        child: Center(child: Text('Ajoute des revenus, dépenses ou investissements pour voir le flux.')),
      );
    }

    final nodes = <SankeyNode>[];
    final links = <SankeyLink>[];
    final nodeColors = <String, Color>{};

    final revenusNode = SankeyNode(id: 0, label: 'Revenus');
    final disponibleNode = SankeyNode(id: 1, label: 'Disponible');
    final depensesNode = SankeyNode(id: 2, label: 'Dépenses');
    final investissementsNode = SankeyNode(id: 3, label: 'Investissements');
    nodes.addAll([revenusNode, disponibleNode, depensesNode, investissementsNode]);
    nodeColors['Revenus'] = const Color(0xFF22C55E);
    nodeColors['Disponible'] = const Color(0xFFF5F5F5);
    nodeColors['Dépenses'] = const Color(0xFFEF4444);
    nodeColors['Investissements'] = const Color(0xFFEAB308);

    if (totalRevenues > 0) {
      links.add(SankeyLink(source: revenusNode, target: disponibleNode, value: totalRevenues));
    }
    if (totalExpenses > 0) {
      links.add(SankeyLink(source: disponibleNode, target: depensesNode, value: totalExpenses));
    }
    if (totalInvestments > 0) {
      links.add(SankeyLink(source: disponibleNode, target: investissementsNode, value: totalInvestments));
    }

    var nextId = 4;
    for (final category in data.expenseCategories) {
      final sum = category.items.fold<double>(0, (s, i) => s + i.amount);
      if (sum <= 0) continue;
      final catName = category.name.isEmpty ? 'Sans catégorie' : category.name;
      final catNode = SankeyNode(id: nextId++, label: catName);
      nodes.add(catNode);
      nodeColors[catName] = const Color(0xFFDC2626);
      links.add(SankeyLink(source: depensesNode, target: catNode, value: sum));
      for (final item in category.items) {
        if (item.amount <= 0) continue;
        final itemName = item.name.isEmpty ? 'Dépense' : item.name;
        final itemNode = SankeyNode(id: nextId++, label: itemName);
        nodes.add(itemNode);
        nodeColors[itemName] = const Color(0xFF991B1B);
        links.add(SankeyLink(source: catNode, target: itemNode, value: item.amount));
      }
    }

    for (final category in data.investmentCategories) {
      final sum = category.items.fold<double>(0, (s, i) => s + i.amount);
      if (sum <= 0) continue;
      final catName = category.name.isEmpty ? 'Sans catégorie' : category.name;
      final catNode = SankeyNode(id: nextId++, label: catName);
      nodes.add(catNode);
      nodeColors[catName] = const Color(0xFFCA8A04);
      links.add(SankeyLink(source: investissementsNode, target: catNode, value: sum));
      for (final item in category.items) {
        if (item.amount <= 0) continue;
        final itemName = item.name.isEmpty ? 'Investissement' : item.name;
        final itemNode = SankeyNode(id: nextId++, label: itemName);
        nodes.add(itemNode);
        nodeColors[itemName] = const Color(0xFF713F12);
        links.add(SankeyLink(source: catNode, target: itemNode, value: item.amount));
      }
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        const height = 560.0;
        final dataSet = SankeyDataSet(nodes: nodes, links: links);
        final sankey = generateSankeyLayout(width: width, height: height);
        dataSet.layout(sankey);

        return SankeyDiagramWidget(
          data: dataSet,
          nodeColors: nodeColors,
          size: Size(width, height),
          showLabels: true,
          showTexture: true,
        );
      },
    );
  }
}