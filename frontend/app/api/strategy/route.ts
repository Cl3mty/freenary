import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type StrategyFileNote = {
  title: string;
  markdown: string;
  fileName: string;
};

function getStrategyFilePath() {
  const dirPath = path.join(process.cwd(), '..', 'data', 'strategy');
  const filePath = path.join(dirPath, 'strategy.md');
  return { dirPath, filePath };
}

function slugifyTitle(title: string) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'note';
}

function sanitizeMdFileName(fileName: string) {
  const base = path.basename(fileName).replace(/\.md$/i, '');
  return `${slugifyTitle(base)}.md`;
}

function readStrategyFiles(dirPath: string): StrategyFileNote[] {
  if (!fs.existsSync(dirPath)) return [];

  return fs
    .readdirSync(dirPath)
    .filter(fileName => fileName.endsWith('.md') && fileName !== 'strategy.md')
    .map(fileName => {
      const filePath = path.join(dirPath, fileName);
      const markdown = fs.readFileSync(filePath, 'utf8');
      const baseName = fileName.replace(/\.md$/i, '');
      const title = baseName
        .split('-')
        .filter(Boolean)
        .map(part => part[0].toUpperCase() + part.slice(1))
        .join(' ');

      return {
        title: title || 'Note',
        markdown,
        fileName,
      };
    });
}

export async function GET() {
  try {
    const { dirPath, filePath } = getStrategyFilePath();
    const files = readStrategyFiles(dirPath);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: true, content: '', files });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json({ success: true, content, files });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de charger le fichier' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, notes } = await request.json() as {
      content: string;
      notes?: Array<{ title?: string; markdown?: string; fileName?: string }>;
    };

    const { dirPath, filePath } = getStrategyFilePath();

    // Créer le dossier si nécessaire
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf8');

    if (Array.isArray(notes)) {
      for (const note of notes) {
        const title = (note.title || 'Note').trim();
        const markdown = note.markdown || '';
        const noteFileName = note.fileName
          ? sanitizeMdFileName(note.fileName)
          : `${slugifyTitle(title)}.md`;
        const noteFilePath = path.join(dirPath, noteFileName);
        fs.writeFileSync(noteFilePath, markdown, 'utf8');
      }
    }

    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de sauvegarder le fichier' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { fileName, title } = await request.json() as { fileName?: string; title?: string };
    const { dirPath } = getStrategyFilePath();

    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ success: true, deleted: false });
    }

    const candidateNames = [
      fileName ? sanitizeMdFileName(fileName) : null,
      title ? `${slugifyTitle(title)}.md` : null,
    ].filter((value): value is string => Boolean(value));

    for (const candidate of candidateNames) {
      const candidatePath = path.join(dirPath, candidate);
      if (fs.existsSync(candidatePath)) {
        fs.unlinkSync(candidatePath);
        return NextResponse.json({ success: true, deleted: true, fileName: candidate });
      }
    }

    return NextResponse.json({ success: true, deleted: false });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de supprimer le fichier' }, { status: 500 });
  }
}