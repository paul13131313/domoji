/**
 * KanjiVG SVGファイルからひらがな・カタカナのストロークデータを抽出し、
 * src/data/kana-strokes.ts に出力するスクリプト
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KANJIVG_DIR = "/tmp/kanjivg/kanji";
const OUTPUT_PATH = join(__dirname, "..", "src", "data", "kana-strokes.ts");

// ひらがな: U+3041 - U+3093 (ぁ-ん), カタカナ: U+30A1 - U+30F3 (ァ-ン)
// 基本文字のみ（小文字含む）
const HIRAGANA_RANGE = [];
for (let code = 0x3041; code <= 0x3093; code++) {
  HIRAGANA_RANGE.push(code);
}

const KATAKANA_RANGE = [];
for (let code = 0x30a1; code <= 0x30f3; code++) {
  KATAKANA_RANGE.push(code);
}

const ALL_CODES = [...HIRAGANA_RANGE, ...KATAKANA_RANGE];

function extractPathsFromSvg(svgContent) {
  const paths = [];
  // Match all <path> elements with d attribute
  const pathRegex = /<path[^>]*\bd="([^"]+)"[^>]*>/g;
  let match;
  while ((match = pathRegex.exec(svgContent)) !== null) {
    const d = match[1];
    // Skip paths that are part of stroke number labels (typically very short)
    if (d.length > 5) {
      paths.push(d);
    }
  }
  return paths;
}

function extractViewBox(svgContent) {
  const match = svgContent.match(/viewBox="([^"]+)"/);
  return match ? match[1] : "0 0 109 109";
}

// Approximate SVG path length from d attribute
function approximatePathLength(d) {
  // Simple estimation: count command segments and multiply
  const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz]/g) || [];
  const numbers = d.match(/-?[\d.]+/g) || [];
  // Very rough: each segment contributes ~20-50 units on a 109x109 canvas
  let length = 0;
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i].toUpperCase();
    if (cmd === "M" || cmd === "Z") {
      length += 0;
    } else if (cmd === "C" || cmd === "S") {
      length += 60;
    } else if (cmd === "Q" || cmd === "T") {
      length += 45;
    } else {
      length += 30;
    }
  }
  // Minimum length to avoid zero
  return Math.max(length, 50);
}

async function main() {
  console.log("Extracting kana stroke data from KanjiVG...");

  const entries = {};
  let found = 0;
  let notFound = 0;

  for (const code of ALL_CODES) {
    const hex = code.toString(16).padStart(5, "0");
    const char = String.fromCodePoint(code);
    const filename = `${hex}.svg`;
    const filepath = join(KANJIVG_DIR, filename);

    if (!existsSync(filepath)) {
      console.log(`  Not found: ${char} (U+${hex})`);
      notFound++;
      continue;
    }

    const svgContent = readFileSync(filepath, "utf-8");
    const viewBox = extractViewBox(svgContent);
    const paths = extractPathsFromSvg(svgContent);

    if (paths.length === 0) {
      console.log(`  No strokes: ${char} (U+${hex})`);
      notFound++;
      continue;
    }

    entries[char] = {
      char,
      viewBox,
      strokes: paths.map((d) => ({
        d,
        length: approximatePathLength(d),
      })),
    };
    found++;
  }

  console.log(`\nFound: ${found}, Not found: ${notFound}`);

  // Generate TypeScript output
  let ts = `// Auto-generated from KanjiVG — do not edit manually
// ひらがな・カタカナのSVGストロークデータ

export type Stroke = {
  d: string;
  length: number;
};

export type CharData = {
  char: string;
  viewBox: string;
  strokes: Stroke[];
};

export const kanaData: Record<string, CharData> = {\n`;

  for (const [char, data] of Object.entries(entries)) {
    ts += `  '${char}': {\n`;
    ts += `    char: '${char}',\n`;
    ts += `    viewBox: '${data.viewBox}',\n`;
    ts += `    strokes: [\n`;
    for (const stroke of data.strokes) {
      ts += `      { d: '${stroke.d.replace(/'/g, "\\'")}', length: ${stroke.length} },\n`;
    }
    ts += `    ],\n`;
    ts += `  },\n`;
  }

  ts += `};\n`;

  // Ensure output directory exists
  const outDir = dirname(OUTPUT_PATH);
  if (!existsSync(outDir)) {
    const { mkdirSync } = await import("fs");
    mkdirSync(outDir, { recursive: true });
  }

  writeFileSync(OUTPUT_PATH, ts, "utf-8");
  console.log(`\nWritten to: ${OUTPUT_PATH}`);
  console.log(`Total characters: ${Object.keys(entries).length}`);
}

main();
