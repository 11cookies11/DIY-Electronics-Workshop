#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SEARCH_URL = "https://poly.pizza/search/";
const MODEL_URL = "https://poly.pizza/m/";
const STATIC_URL = "https://static.poly.pizza/";
const DEFAULT_OUTPUT_DIR = "public/models/poly-pizza";
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "assets",
  "asset",
  "but",
  "by",
  "for",
  "from",
  "in",
  "inside",
  "kit",
  "low",
  "me",
  "model",
  "models",
  "module",
  "of",
  "on",
  "or",
  "pack",
  "poly",
  "related",
  "set",
  "some",
  "the",
  "to",
  "with",
]);

function printHelp() {
  console.log(`Poly Pizza prompt fetcher

Usage:
  node scripts/poly-pizza-fetch.mjs --prompt "touch screen battery pcb"

Options:
  --prompt <text>      Prompt used to derive search queries
  --queries <list>     Comma-separated search phrases, bypass prompt splitting
  --limit <number>     Max models to download (default: 8)
  --per-query <number> Max candidates taken from each search page (default: 12)
  --dir <path>         Output directory (default: public/models/poly-pizza)
  --preview            Also download preview webp files
  --dry-run            Only print selected models, do not download files
  --help               Show this help
`);
}

function parseArgs(argv) {
  const args = {
    limit: 8,
    perQuery: 12,
    dir: DEFAULT_OUTPUT_DIR,
    dryRun: false,
    preview: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help") {
      args.help = true;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--preview") {
      args.preview = true;
      continue;
    }

    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${token}`);
    }

    if (token === "--prompt") {
      args.prompt = value;
      i += 1;
      continue;
    }
    if (token === "--queries") {
      args.queries = value;
      i += 1;
      continue;
    }
    if (token === "--limit") {
      args.limit = Number.parseInt(value, 10);
      i += 1;
      continue;
    }
    if (token === "--per-query") {
      args.perQuery = Number.parseInt(value, 10);
      i += 1;
      continue;
    }
    if (token === "--dir") {
      args.dir = value;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.help && !args.prompt && !args.queries) {
    throw new Error("Provide --prompt or --queries");
  }
  if (!Number.isFinite(args.limit) || args.limit < 1) {
    throw new Error("--limit must be a positive integer");
  }
  if (!Number.isFinite(args.perQuery) || args.perQuery < 1) {
    throw new Error("--per-query must be a positive integer");
  }

  return args;
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildQueriesFromPrompt(prompt) {
  const normalized = normalizeText(prompt);
  const parts = normalized
    .split(/\b(?:and|with|plus|including|include|without|for)\b|[,/|;]+/gu)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);

  const words = normalized
    .split(/\s+/u)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

  const wordPairs = [];
  for (let index = 0; index < words.length - 1; index += 1) {
    const pair = `${words[index]} ${words[index + 1]}`;
    if (!STOP_WORDS.has(words[index]) && !STOP_WORDS.has(words[index + 1])) {
      wordPairs.push(pair);
    }
  }

  return uniq([normalized, ...parts, ...wordPairs, ...words]).slice(0, 8);
}

function buildQueries(args) {
  if (args.queries) {
    return uniq(
      args.queries
        .split(",")
        .map((query) => normalizeText(query))
        .filter((query) => query.length > 0),
    );
  }

  return buildQueriesFromPrompt(args.prompt);
}

function extractServerState(html) {
  const marker = "window.__SERVER_APP_STATE__ =";
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error("Unable to find server state in HTML");
  }

  const scriptStart = markerIndex + marker.length;
  const scriptEnd = html.indexOf("</script>", scriptStart);
  if (scriptEnd === -1) {
    throw new Error("Unable to locate server state script end");
  }

  const jsonText = html.slice(scriptStart, scriptEnd).trim().replace(/;$/, "");
  return JSON.parse(jsonText);
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "SecondMeEmbeddedSoftwareStore PolyPizza Fetcher/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchSearchResults(query) {
  const html = await fetchHtml(`${SEARCH_URL}${encodeURIComponent(query)}`);
  const state = extractServerState(html);
  const results =
    state?.initialData?.result ??
    state?.initialData?.results?.[0] ??
    state?.initialData?.results ??
    [];
  return results.map((result, index) => ({
    ...result,
    query,
    searchRank: index,
  }));
}

function scoreResult(result, queryTokens) {
  const haystack = normalizeText(`${result.title ?? ""} ${result.alt ?? ""}`);
  let score = Math.max(0, 120 - result.searchRank * 2);

  for (const token of queryTokens) {
    if (haystack === token) {
      score += 60;
    } else if (haystack.includes(token)) {
      score += 20;
    }
  }

  if (/screen|display|monitor|panel|sensor|board|battery|camera|usb|port/u.test(haystack)) {
    score += 8;
  }

  return score;
}

function mergeCandidates(searchResults, perQuery) {
  const merged = new Map();

  for (const { query, results } of searchResults) {
    const queryTokens = normalizeText(query).split(/\s+/u).filter(Boolean);
    for (const result of results.slice(0, perQuery)) {
      const publicID = result.publicID;
      if (!publicID) {
        continue;
      }

      const nextScore = scoreResult(result, queryTokens);
      const current = merged.get(publicID);
      if (current) {
        current.score += nextScore;
        current.matchedQueries.push(query);
        current.searchRanks.push(result.searchRank);
      } else {
        merged.set(publicID, {
          ...result,
          score: nextScore,
          matchedQueries: [query],
          searchRanks: [result.searchRank],
        });
      }
    }
  }

  return [...merged.values()].sort((left, right) => right.score - left.score);
}

async function fetchModelDetails(publicID) {
  const html = await fetchHtml(`${MODEL_URL}${publicID}`);
  const state = extractServerState(html);
  const model = state?.initialData?.model;
  if (!model?.ResourceID) {
    throw new Error(`Missing ResourceID for model ${publicID}`);
  }
  return model;
}

function sanitizeFileName(value) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function downloadFile(url, destination) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "SecondMeEmbeddedSoftwareStore PolyPizza Fetcher/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed for ${url}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(destination, new Uint8Array(arrayBuffer));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const queries = buildQueries(args);
  if (queries.length === 0) {
    throw new Error("No usable queries could be derived from the prompt");
  }

  console.log(`Derived queries: ${queries.join(" | ")}`);

  const searchResults = [];
  for (const query of queries) {
    console.log(`Searching Poly Pizza for "${query}"...`);
    const results = await fetchSearchResults(query);
    searchResults.push({ query, results });
    console.log(`  Found ${results.length} candidates`);
  }

  const mergedCandidates = mergeCandidates(searchResults, args.perQuery);
  const shortlisted = mergedCandidates.slice(0, Math.max(args.limit * 2, args.limit));

  const models = [];
  const usedTitles = new Set();
  for (const candidate of shortlisted) {
    if (models.length >= args.limit) {
      break;
    }

    try {
      const detail = await fetchModelDetails(candidate.publicID);
      const normalizedTitle = normalizeText(detail.Title ?? "");
      if (normalizedTitle && usedTitles.has(normalizedTitle)) {
        console.log(`Skipping duplicate title ${detail.Title} (${detail.PublicID})`);
        continue;
      }

      models.push({
        title: detail.Title,
        description: detail.Description,
        publicID: detail.PublicID,
        resourceID: detail.ResourceID,
        licence: detail.Licence,
        type: detail.Type,
        creator: detail.Creator?.Username ?? "Unknown",
        category: detail.Category ?? "",
        tags: detail.Tags ?? [],
        matchedQueries: uniq(candidate.matchedQueries),
        score: candidate.score,
        glbUrl: `${STATIC_URL}${detail.ResourceID}.glb`,
        previewUrl: `${STATIC_URL}${detail.ResourceID}.webp`,
        pageUrl: `${MODEL_URL}${detail.PublicID}`,
      });
      if (normalizedTitle) {
        usedTitles.add(normalizedTitle);
      }
      console.log(`Selected ${detail.Title} (${detail.PublicID})`);
    } catch (error) {
      console.warn(`Skipping ${candidate.publicID}: ${error.message}`);
    }
  }

  if (models.length === 0) {
    throw new Error("No downloadable models were selected");
  }

  const manifest = {
    prompt: args.prompt ?? "",
    queries,
    downloadedAt: new Date().toISOString(),
    models,
  };

  if (args.dryRun) {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  const outputDir = path.resolve(process.cwd(), args.dir);
  await mkdir(outputDir, { recursive: true });

  for (const model of models) {
    const fileBase = sanitizeFileName(`${model.title}-${model.publicID}`);
    const modelPath = path.join(outputDir, `${fileBase}.glb`);
    console.log(`Downloading ${model.title} -> ${modelPath}`);
    await downloadFile(model.glbUrl, modelPath);

    model.localPath = path.relative(process.cwd(), modelPath).replaceAll("\\", "/");

    if (args.preview) {
      const previewPath = path.join(outputDir, `${fileBase}.webp`);
      try {
        await downloadFile(model.previewUrl, previewPath);
        model.previewLocalPath = path.relative(process.cwd(), previewPath).replaceAll("\\", "/");
      } catch (error) {
        console.warn(`Preview download skipped for ${model.publicID}: ${error.message}`);
      }
    }
  }

  const manifestPath = path.join(outputDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Saved manifest -> ${manifestPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
