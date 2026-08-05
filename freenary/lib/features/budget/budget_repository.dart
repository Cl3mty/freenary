import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';
import 'budget_models.dart';

/// Génère des ids courts type "revenue_ab12cd34", à la manière du code JS
/// d'origine, pour les items/catégories (l'id du snapshot lui-même utilise
/// un vrai UUID pour matcher exactement le format du fichier existant).
String generateItemId(String prefix) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  final rand = Random();
  final suffix = List.generate(8, (_) => chars[rand.nextInt(chars.length)]).join();
  return '${prefix}_$suffix';
}

class BudgetRepository {
  final String vaultPath;
  BudgetRepository(this.vaultPath);

  File get _file => File(p.join(vaultPath, 'budget', 'budget_history.json'));

  Future<void> _ensureDir() async {
    final dir = Directory(p.join(vaultPath, 'budget'));
    if (!await dir.exists()) await dir.create(recursive: true);
  }

  Future<List<BudgetSnapshot>> _readAll() async {
    if (!await _file.exists()) return [];
    final content = await _file.readAsString();
    if (content.trim().isEmpty) return [];
    final list = jsonDecode(content) as List;
    return list
        .map((e) => BudgetSnapshot.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Charge le dernier snapshot sauvegardé (comportement identique à
  /// l'ancien /api/budget qui renvoyait `latest`).
  Future<BudgetData> loadLatest() async {
    final all = await _readAll();
    if (all.isEmpty) return BudgetData.empty();
    return all.last.data;
  }

  Future<void> save(BudgetData data) async {
    await _ensureDir();
    final all = await _readAll();
    all.add(BudgetSnapshot(
      id: const Uuid().v4(),
      savedAt: DateTime.now().toUtc(),
      data: data,
    ));
    final jsonList = all.map((s) => s.toJson()).toList();
    await _file.writeAsString(const JsonEncoder.withIndent('  ').convert(jsonList));
  }
}