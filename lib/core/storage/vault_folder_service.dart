import 'dart:io';
import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:file_picker/file_picker.dart';

class VaultFolderService {
  static const _pathKey = 'vault_folder_path';
  static const _bookmarkKey = 'vault_folder_bookmark';
  static const _channel = MethodChannel('com.freenary/secure_bookmarks');

  Future<String?> getSavedVaultPath() async {
    final prefs = await SharedPreferences.getInstance();

    if (Platform.isMacOS) {
      final bookmarkData = prefs.getString(_bookmarkKey);
      if (bookmarkData == null) return null;
      try {
        final parentPath = await _channel.invokeMethod<String>('resolveAndAccess', bookmarkData);
        if (parentPath == null) return null;
        return '$parentPath/.freenary';
      } catch (e) {
        return null;
      }
    }

    final path = prefs.getString(_pathKey);
    if (path != null && !await Directory(path).exists()) return null;
    return path;
  }

  /// Sélectionne un nouveau dossier de données. Si [currentVaultPath] est
  /// fourni (cas d'un changement d'emplacement, pas du premier lancement),
  /// toutes les données existantes sont copiées vers le nouvel emplacement
  /// avant de basculer dessus — rien n'est perdu.
  Future<String?> pickAndCreateVaultFolder({
    String? dialogTitle,
    String? currentVaultPath,
  }) async {
    final result = await FilePicker.getDirectoryPath(dialogTitle: dialogTitle);
    if (result == null) return null;

    final prefs = await SharedPreferences.getInstance();
    String vaultPath;

    if (Platform.isMacOS) {
      final bookmarkData = await _channel.invokeMethod<String>('createBookmark', result);
      if (bookmarkData == null) return null;
      final vaultDir = Directory('$result/.freenary');
      if (!await vaultDir.exists()) await vaultDir.create(recursive: true);
      await _migrateIfNeeded(currentVaultPath, vaultDir);
      await prefs.setString(_bookmarkKey, bookmarkData);
      vaultPath = vaultDir.path;
    } else {
      final vaultDir = Directory('$result${Platform.pathSeparator}.freenary');
      if (!await vaultDir.exists()) await vaultDir.create(recursive: true);
      await _migrateIfNeeded(currentVaultPath, vaultDir);
      await prefs.setString(_pathKey, vaultDir.path);
      vaultPath = vaultDir.path;
    }

    return vaultPath;
  }

  Future<void> _migrateIfNeeded(String? currentVaultPath, Directory newVaultDir) async {
    if (currentVaultPath == null) return; // premier lancement : rien à migrer
    if (p.equals(currentVaultPath, newVaultDir.path)) return; // même dossier : rien à faire

    final oldDir = Directory(currentVaultPath);
    if (!await oldDir.exists()) return;

    await _copyDirectoryContents(oldDir, newVaultDir);
  }

  Future<void> _copyDirectoryContents(Directory source, Directory destination) async {
    if (!await destination.exists()) await destination.create(recursive: true);
    await for (final entity in source.list(followLinks: false)) {
      final newPath = p.join(destination.path, p.basename(entity.path));
      if (entity is Directory) {
        await _copyDirectoryContents(entity, Directory(newPath));
      } else if (entity is File) {
        await entity.copy(newPath);
      }
    }
  }

  Future<void> clearSavedVaultPath() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pathKey);
    await prefs.remove(_bookmarkKey);
  }
}