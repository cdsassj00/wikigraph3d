# wikigraph3d

Point it at a folder of documents and get back **one self-contained HTML file** —
a 3D, searchable knowledge-graph view of that folder. No server, no build step,
no API key, no account.

```
npx github:cdsassj00/wikigraph3d ./my-notes
```

That's it. It scans `./my-notes`, reads every supported document, and writes
`./my-notes-graph.html` next to it. Double-click that file (or open it in any
browser) to explore.

## What it does

1. **Scans** the folder recursively for `.md`, `.txt`, `.pdf`, `.docx`, `.pptx`.
2. **Extracts** text from each file (pure JS parsers — nothing is uploaded
   anywhere, nothing calls an LLM).
3. **Links** documents to each other three ways:
   - explicit `[[wikilink]]` references, if your markdown uses that syntax
     (Obsidian-style)
   - documents that live in the same subfolder (connected in a light ring, so
     "things you filed together" stay visually together)
   - documents that share enough distinctive vocabulary (a small built-in
     TF-IDF keyword overlap — no API key, no embeddings service)
4. **Renders** a single HTML file: a 3D force-directed graph (three.js /
   3d-force-graph) with fuzzy search (Fuse.js), a type filter, a flat list-view
   fallback for anyone who doesn't want to drive a 3D camera, and a resizable
   detail panel that renders the clicked document's content
   (sanitized with DOMPurify — the input is arbitrary user documents, so
   nothing is trusted).

## Usage

Not published to npm — install directly from GitHub via npx:

```
npx github:cdsassj00/wikigraph3d <folder> [options]

Options:
  --out, -o <file>   Output HTML path (default: <folder>-graph.html)
  --open             Open the result in your default browser when done
  --help, -h         Show help
```

Example:

```
npx github:cdsassj00/wikigraph3d ~/Documents/research --out research-graph.html --open
```

Want it as a shorter local command? Clone it and `npm link` once:

```
git clone https://github.com/cdsassj00/wikigraph3d.git
cd wikigraph3d && npm install && npm link
wikigraph3d ~/Documents/research
```

## What it is not

- **Not a summarizer.** No AI is involved anywhere in this pipeline — that's
  deliberate, so it works with zero configuration and zero cost. If you want
  AI-written summaries and semantically-judged relationships between
  documents, that's a different (larger) tool; this one is the free,
  instant, "just show me the shape of this folder" version.
- **Not a live server.** The output is a static file. Re-run the command to
  refresh it after your documents change.
- **Not exhaustive parsing.** PDF/DOCX/PPTX extraction is text-only (no
  OCR of scanned/image-only pages, no tables-as-tables, no speaker notes).

## How the graph is colored

Each file's top-level subfolder becomes its "type" (and its color/legend
entry). A flat folder with no subfolders gets a single type. There's no
folder-naming convention to follow — however you already organize your
documents is the ontology.

## Privacy

Everything runs locally. The three visualization libraries (three.js,
3d-force-graph, marked, Fuse.js, DOMPurify) are loaded from CDN with
Subresource Integrity hashes pinned — your document *content* never leaves
your machine, only your browser's request for those static library files
touches the network.

## License

MIT
