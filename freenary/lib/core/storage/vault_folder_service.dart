import 'dart:io';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:file_picker/file_picker.dart';

class VaultFolderService {
  static const _bookmarkKey = 'vault_folder_bookmark';
  static const _channel = MethodChannel('com.freenary/secure_bookmarks');

  /// Résout le bookmark sauvegardé, redemande l'accès sécurisé au dossier
  /// (obligatoire à chaque lancement) et reconstruit le chemin du vault.
  Future<String?> getSavedVaultPath() async {
    final prefs = await SharedPreferences.getInstance();
    final bookmarkData = prefs.getString(_bookmarkKey);
    if (bookmarkData == null) return null;

    try {
      final parentPath = await _channel.invokeMethod<String>(
        'resolveAndAccess',
        bookmarkData,
      );
      if (parentPath == null) return null;
      return '$parentPath/.freenary';
    } catch (e) {
      // Bookmark invalide/révoqué (ex: dossier déplacé/supprimé) : on force un re-pick.
      return null;
    }
  }

  Future<String?> pickAndCreateVaultFolder({String? dialogTitle}) async {
    final result = await FilePicker.getDirectoryPath(
      dialogTitle: dialogTitle,
    );
    if (result == null) return null;

    final bookmarkData = await _channel.invokeMethod<String>(
      'createBookmark',
      result,
    );
    if (bookmarkData == null) return null;

    final vaultDir = Directory('$result/.freenary');
    if (!await vaultDir.exists()) {
      await vaultDir.create(recursive: true);
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_bookmarkKey, bookmarkData);

    return vaultDir.path;
  }

  Future<void> clearSavedVaultPath() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_bookmarkKey);
  }
}