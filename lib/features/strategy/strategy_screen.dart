import 'package:shadcn_flutter/shadcn_flutter.dart' hide Text;
import 'package:shadcn_flutter/shadcn_flutter.dart' as shadcn show Text;
import '../../core/ui/frosted_card.dart';
import '../../core/date_format.dart';
import 'strategy_repository.dart';
import 'note_editor.dart';

class StrategyScreen extends StatefulWidget {
  final String vaultPath;
  const StrategyScreen({super.key, required this.vaultPath});

  @override
  State<StrategyScreen> createState() => _StrategyScreenState();
}

class _StrategyScreenState extends State<StrategyScreen> {
  late StrategyRepository _repo;

  final ValueNotifier<List<StrategyNote>> _notes = ValueNotifier([]);
  String? _selectedId;
  bool _loading = true;
  int _loadGeneration = 0;

  @override
  void initState() {
    super.initState();
    _repo = StrategyRepository(widget.vaultPath);
    _loadNotes();
  }

  @override
  void didUpdateWidget(covariant StrategyScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.vaultPath != widget.vaultPath) {
      _repo = StrategyRepository(widget.vaultPath);
      _selectedId = null;
      _loading = true;
      _notes.value = const [];
      _loadNotes();
    }
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _loadNotes() async {
    final generation = ++_loadGeneration;
    final notes = await _repo.listNotes();
    if (!mounted || generation != _loadGeneration) return;
    _notes.value = notes;
    if (_loading) {
      setState(() {
        _selectedId ??= notes.isNotEmpty ? notes.first.id : null;
        _loading = false;
      });
    }
  }

  Future<void> _createNote() async {
    final note = await _repo.createNote();
    await _loadNotes();
    if (!mounted) return;
    setState(() => _selectedId = note.id);
  }

  Future<void> _deleteNote(String id) async {
    await _repo.deleteNote(id);
    if (!mounted) return;
    if (_selectedId == id) {
      setState(() => _selectedId = null);
    }
    await _loadNotes();
  }

  void _selectNote(String id) {
    if (id == _selectedId) return;
    setState(() => _selectedId = id);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    return Padding(
      padding: const EdgeInsets.all(16),
      child: FrostedCard(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: 280,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        const Expanded(child: shadcn.Text('Notes')),
                        IconButton.ghost(
                          icon: const Icon(LucideIcons.filePlus),
                          onPressed: _createNote,
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: ValueListenableBuilder<List<StrategyNote>>(
                      valueListenable: _notes,
                      builder: (context, notes, _) {
                        return ListView.builder(
                          itemCount: notes.length,
                          itemBuilder: (context, i) {
                            final note = notes[i];
                            final selected = note.id == _selectedId;
                            final theme = Theme.of(context);
                            return GestureDetector(
                              key: ValueKey(note.id),
                              onTap: () => _selectNote(note.id),
                              child: Container(
                                color: selected ? theme.colorScheme.accent : Colors.transparent,
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          shadcn.Text(
                                            note.title,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          shadcn.Text(formatDateDdMmYyyy(note.updatedAt)).muted().small(),
                                        ],
                                      ),
                                    ),
                                    IconButton.ghost(
                                      icon: const Icon(LucideIcons.trash2, size: 16),
                                      onPressed: () => _deleteNote(note.id),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
            const VerticalDivider(width: 1),
            Expanded(
              child: _selectedId == null
                  ? const Center(child: shadcn.Text('Sélectionne ou crée une note'))
                  : NoteEditor(
                      key: ValueKey(_selectedId),
                      repository: _repo,
                      noteId: _selectedId!,
                      onSaved: _loadNotes,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}