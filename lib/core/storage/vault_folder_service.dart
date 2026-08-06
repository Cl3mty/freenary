import 'dart:io';
import 'package:flutter/services.dart';
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

    // Windows/Linux : pas de sandbox à contourner, le chemin brut suffit.
    final path = prefs.getString(_pathKey);
    if (path != null && !await Directory(path).exists()) return null;
    return path;
  }

  Future<String?> pickAndCreateVaultFolder({String? dialogTitle}) async {
    final result = await FilePicker.getDirectoryPath(dialogTitle: dialogTitle);
    if (result == null) return null;

    final prefs = await SharedPreferences.getInstance();

    if (Platform.isMacOS) {
      final bookmarkData = await _channel.invokeMethod<String>('createBookmark', result);
      if (bookmarkData == null) return null;
      final vaultDir = Directory('$result/.freenary');
      if (!await vaultDir.exists()) await vaultDir.create(recursive: true);
      await prefs.setString(_bookmarkKey, bookmarkData);
      return vaultDir.path;
    }

    // Windows/Linux
    final vaultDir = Directory('$result${Platform.pathSeparator}.freenary');
    if (!await vaultDir.exists()) await vaultDir.create(recursive: true);
    await prefs.setString(_pathKey, vaultDir.path);
    return vaultDir.path;
  }

  Future<void> clearSavedVaultPath() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pathKey);
    await prefs.remove(_bookmarkKey);
  }
}