import 'package:file_picker/file_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

class VaultFolderService {
  static const _prefsKey = 'vault_folder_path';

  Future<String?> getSavedFolder() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_prefsKey);
  }

  Future<String?> pickAndSaveFolder() async {
    final path = await FilePicker.getDirectoryPath(
      dialogTitle: 'Choisis le dossier synchronisé (iCloud, Google Drive, ...)',
    );
    if (path == null) return null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, path);
    return path;
  }
}
