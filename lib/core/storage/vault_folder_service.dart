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

  /// Sélectionne un nouveau dossier de données.
  /// - Si ce dossier contient déjà `.freenary`, on le charge tel quel.
  /// - Sinon, si [currentVaultPath] est fourni, on migre (copie) les données
  ///   existantes vers le nouvel emplacement, en rapportant la progression
  ///   via [onMigrationProgress] (fichiers copiés / total).
  Future<String?> pickAndCreateVaultFolder({
    String? dialogTitle,
    String? currentVaultPath,
    void Function(int copied, int total)? onMigrationProgress,
  }) async {
    final result = await FilePicker.getDirectoryPath(dialogTitle: dialogTitle);
    if (result == null) return null;

    final prefs = await SharedPreferences.getInstance();
    final vaultDir = Directory(p.join(result, '.freenary'));
    final alreadyExists = await vaultDir.exists();

    if (!alreadyExists) {
      await vaultDir.create(recursive: true);

      if (currentVaultPath != null && !p.equals(currentVaultPath, vaultDir.path)) {
        final oldDir = Directory(currentVaultPath);
        if (await oldDir.exists()) {
          final total = await _countFiles(oldDir);
          var copied = 0;
          onMigrationProgress?.call(0, total);

          final errors = await _copyDirectoryContents(oldDir, vaultDir, () {
            copied++;
            onMigrationProgress?.call(copied, total);
          });

          if (errors.isNotEmpty) {
            // ignore: avoid_print
            print('Erreurs de migration (${errors.length} fichier(s) non copiés) :');
            for (final e in errors) {
              print('  - $e');
            }
          }
        }
      }
    }

    if (Platform.isMacOS) {
      final bookmarkData = await _channel.invokeMethod<String>('createBookmark', result);
      if (bookmarkData == null) return null;
      await prefs.setString(_bookmarkKey, bookmarkData);
    } else {
      await prefs.setString(_pathKey, vaultDir.path);
    }

    return vaultDir.path;
  }

  Future<int> _countFiles(Directory dir) async {
    var count = 0;
    await for (final entity in dir.list(recursive: true, followLinks: false)) {
      if (entity is File) count++;
    }
    return count == 0 ? 1 : count; // évite une division par zéro si dossier vide
  }

  Future<List<String>> _copyDirectoryContents(
    Directory source,
    Directory destination,
    void Function() onFileCopied,
  ) async {
    final errors = <String>[];
    if (!await destination.exists()) await destination.create(recursive: true);

    await for (final entity in source.list(followLinks: false)) {
      final newPath = p.join(destination.path, p.basename(entity.path));
      try {
        if (entity is Directory) {
          errors.addAll(await _copyDirectoryContents(entity, Directory(newPath), onFileCopied));
        } else if (entity is File) {
          await entity.copy(newPath);
          onFileCopied();
        }
      } catch (e) {
        errors.add('${entity.path} : $e');
        onFileCopied(); // on avance quand même la barre pour ne pas la bloquer
      }
    }
    return errors;
  }

  Future<void> clearSavedVaultPath() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pathKey);
    await prefs.remove(_bookmarkKey);
  }
}