import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';

class UpdateInfo {
  final String latestVersion;
  final String downloadUrl;
  final String releaseNotesUrl;

  UpdateInfo({
    required this.latestVersion,
    required this.downloadUrl,
    required this.releaseNotesUrl,
  });
}

class UpdateChecker {
  final String githubOwner;
  final String githubRepo;

  UpdateChecker({required this.githubOwner, required this.githubRepo});

  /// Retourne les infos de mise à jour si une version plus récente que
  /// l'app installée est publiée sur GitHub, sinon null (y compris en cas
  /// d'erreur réseau — on n'embête jamais l'utilisateur pour ça).
  Future<UpdateInfo?> checkForUpdate() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final currentVersion = info.version;

      final response = await http.get(
        Uri.parse('https://api.github.com/repos/$githubOwner/$githubRepo/releases/latest'),
        headers: {'Accept': 'application/vnd.github+json'},
      );
      if (response.statusCode != 200) return null;

      final json = jsonDecode(response.body) as Map<String, dynamic>;
      final tagName = (json['tag_name'] as String?) ?? '';
      final latestVersion = tagName.startsWith('v') ? tagName.substring(1) : tagName;
      if (latestVersion.isEmpty) return null;
      if (!_isNewer(latestVersion, currentVersion)) return null;

      final assets = (json['assets'] as List?) ?? [];
      String? downloadUrl;
      for (final asset in assets) {
        final name = (asset['name'] as String? ?? '').toLowerCase();
        if (Platform.isMacOS && (name.endsWith('.dmg') || name.contains('macos'))) {
          downloadUrl = asset['browser_download_url'] as String?;
          break;
        }
        if (Platform.isWindows && name.endsWith('.exe')) {
          downloadUrl = asset['browser_download_url'] as String?;
          break;
        }
        if (Platform.isLinux && (name.endsWith('.appimage') || name.endsWith('.deb'))) {
          downloadUrl = asset['browser_download_url'] as String?;
          break;
        }
      }
      // Repli : la page de la release elle-même, si aucun binaire ne matche.
      downloadUrl ??= json['html_url'] as String?;

      return UpdateInfo(
        latestVersion: latestVersion,
        downloadUrl: downloadUrl ?? 'https://github.com/$githubOwner/$githubRepo/releases/latest',
        releaseNotesUrl: json['html_url'] as String? ?? '',
      );
    } catch (_) {
      return null;
    }
  }

  bool _isNewer(String remote, String current) {
    List<int> parse(String v) => v.split('.').map((p) => int.tryParse(p) ?? 0).toList();
    final r = parse(remote);
    final c = parse(current);
    for (var i = 0; i < r.length || i < c.length; i++) {
      final rv = i < r.length ? r[i] : 0;
      final cv = i < c.length ? c[i] : 0;
      if (rv != cv) return rv > cv;
    }
    return false;
  }
}