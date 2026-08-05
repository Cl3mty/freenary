import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as p;
import 'package:shared_preferences/shared_preferences.dart';

class VaultFolderService {
  static const _prefsKey = 'vault_folder_path'; // chemin complet vers .freenary
  static const _vaultDirName = '.freenary';

  Future<String?> getSavedVaultPath() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_prefsKey);
  }

  /// Supprime le chemin sauvegardé dans les préférences.
  Future<void> clearSavedVaultPath() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove(_prefsKey);
}

  /// Ouvre le picker, crée .freenary dans le dossier choisi si besoin,
  /// sauvegarde et retourne le chemin complet du dossier de données.
  Future<String?> pickAndCreateVaultFolder({
    String dialogTitle = 'Choisis l\'emplacement de tes données Freenary',
  }) async {
    final chosen = await FilePicker.getDirectoryPath(dialogTitle: dialogTitle);
    if (chosen == null) return null;

    final vaultPath = p.join(chosen, _vaultDirName);
    final vaultDir = Directory(vaultPath);
    if (!await vaultDir.exists()) {
      await vaultDir.create(recursive: true);
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, vaultPath);
    return vaultPath;
  }
}