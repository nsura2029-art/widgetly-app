# i18n translation pipeline

Bulk-translates `src/i18n/messages/en.json` into the other 23 locales
using a paid MT provider (DeepL / Google Cloud Translation / Gemini)
or a free fallback (LibreTranslate). Writes the result to
`src/i18n/messages/<locale>.json`, preserving key order and only
translating string values (not keys).

## Quick start (local)

### Option A: API-based (needs a key)

```bash
# 1. DeepL (best quality for European languages, ~$0.05 for 196 × 22 strings)
DEEPL_API_KEY=... pnpm i18n:translate:deepl

# 2. Google Cloud Translation (covers all 22 locales incl. CJK, ~$0.10)
GOOGLE_TRANSLATE_API_KEY=... pnpm i18n:translate:google

# 3. Gemini (public API, AIza key)
GEMINI_API_KEY=... pnpm i18n:translate:gemini

# 4. Gemini via Vertex AI (gcloud OAuth token, for GCP projects)
export GEMINI_VERTEX_TOKEN=$(gcloud auth print-access-token)
export GEMINI_PROJECT_ID=556752020957      # your GCP project number
pnpm i18n:translate:gemini:vertex

# 5. Auto (DeepL → Google → Gemini → LibreTranslate fallback chain)
DEEPL_API_KEY=... GEMINI_API_KEY=... pnpm i18n:translate:auto

# 6. Subset of locales (any provider)
DEEPL_API_KEY=... node scripts/translate-messages.mjs --provider=deepl --locales=es,fr,de,pt

# 7. Dry-run preview (no API calls, no file writes)
pnpm i18n:translate:dry
```

### Option B: File-based (no API key, works with DeepL web UI / Google web UI / ChatGPT / human translators)

```bash
# 1. Generate the per-locale .txt files for translation.
pnpm i18n:export
# This creates:
#   tmp/translate/en.json             (copy of source for reference)
#   tmp/translate/<locale>.txt        (one line per string: <id>\t<text>)
#   tmp/translate/<locale>.ids.json   (id -> { path, tags } mapping)

# 2. Upload each tmp/translate/<locale>.txt to the translator of choice:
#    - DeepL web UI:    deepl.com/translator -> "Translate files" -> upload .txt
#    - Google Translate: translate.google.com -> "Documents" tab -> upload .txt
#    - ChatGPT:         paste the file contents, ask for translation,
#                       save the response back to the same path
#    - Human:           send the .txt to a translator, get it back translated
#
#    DeepL Pro/Free tips:
#      - "Preserve formatting" should be ON (it is by default)
#      - "Source language" = English, "Target language" = <locale>
#      - For zh-CN / zh-TW, pick the matching Chinese variant
#    After translation, download the file back to tmp/translate/<locale>.txt.

# 3. Import the translated files.
pnpm i18n:import
#   ✓ es  196 imported,   0 skipped,   0 placeholder warnings
#   ✓ pt  196 imported,   0 skipped,   0 placeholder warnings
#   ✓ fr  196 imported,   0 skipped,   0 placeholder warnings

# 4. Clean up.
rm -rf tmp/translate
```

The file-based workflow is:
- **API-free** (no DeepL/Google API key needed)
- **Provider-agnostic** (any tool that can translate a .txt works)
- **Auditable** (you can read every translation before importing)
- **Resumable** (the import skips strings that already have a non-English value in the target locale, so partial passes are fine)
- **ICU-safe** (placeholders are wrapped as `<xN>name</xN>` before translation, then unwrapped to `{name}` on import — so DeepL doesn't try to translate the variable names)

### Option C: Incremental update (for already-partially-translated locales)

```bash
# If a locale already has some translations (e.g. id.json has 66
# LibreTranslate strings from a previous pass), use --mode=missing
# to export only the strings still equal to English. Smaller files,
# faster to translate, no risk of overwriting good translations.

pnpm i18n:export:missing
#   id  130 exported,  66 already translated (skipped)  (of 196 total)
#   ... (same for the other locales)

# ... translate the .txt files ...

pnpm i18n:import
```

## Provider reference

| Provider | Auth | Best for | Env var(s) |
|---|---|---|---|
| `libretranslate` | none (free public) | MVP only, marketing copy | — |
| `deepl` | DeepL Auth Key | European languages | `DEEPL_API_KEY` |
| `google` | GCP API key | All 22 locales | `GOOGLE_TRANSLATE_API_KEY` |
| `gemini` | Public AIza key OR Vertex OAuth | All 22, with prompt context | `GEMINI_API_KEY` *or* `GEMINI_VERTEX_TOKEN` + `GEMINI_PROJECT_ID` |
| `auto` | chain of the above | recommended | see individual providers |

Optional for Gemini: `GEMINI_MODEL` (default `gemini-2.0-flash`; can also
be `gemini-2.0-flash-lite`, `gemini-1.5-pro`, etc.).

## How the auto-detection works

For Gemini, the script auto-detects auth mode from the credential:

| Prefix | Auth | Endpoint |
|---|---|---|
| `AIza...` | Public Gemini API | `generativelanguage.googleapis.com` (uses `?key=...`) |
| `ya29.`, `AQ.`, `1//` | Vertex AI OAuth | `us-central1-aiplatform.googleapis.com` (uses `Authorization: Bearer ...`) |

## ICU placeholder handling

Different providers handle ICU `{placeholder}` tokens differently:

- **Google Cloud Translation** (`format=text`): leaves placeholders alone
  automatically. No special handling.
- **DeepL**: would try to translate the text inside braces. The script
  pre-processes `{varName}` → `<x1>varName</x1>`, sends to DeepL with
  `tag_handling=xml` and `ignore_tags=x1`, then post-processes the
  response back to `{varName}`.
- **Gemini**: uses a structured prompt that explicitly forbids
  translating placeholders, brand names, URLs, or code-like tokens.

All three providers are tested to round-trip placeholders for `{year}`,
`{siteName}`, `{name}`, `{count}`, `{var}`, `{a}`, `{b}`, including
duplicate `{var}` twice in one string.

## Human review checklist (post-pass)

After a paid pass, run this grep to find the common MT artifacts:

```bash
# 1. Broken ICU placeholders (should NEVER have anything other than
#    the original English names like {year}, {siteName})
grep -rEn "\{[a-zA-Z0-9_]*\}" src/i18n/messages/*.json | grep -v "\.en\.json" | head -20

# 2. Suspicious brand-name translations (Widgetly, GitHub should be unchanged)
grep -rn "Widgetly\|GitHub\|Twitter\|Discord" src/i18n/messages/*.json | grep -v en.json

# 3. Numbers that got spaces added (e.g. "500 +" instead of "500+")
grep -rEn "[0-9] \+|[0-9] %" src/i18n/messages/*.json | head -10

# 4. Empty / very short strings (the script writes 0-length results sometimes)
python3 -c "
import json, glob
for f in glob.glob('src/i18n/messages/*.json'):
    d = json.load(open(f))
    def walk(o, p=''):
        for k, v in o.items():
            path = p + '.' + k if p else k
            if isinstance(v, str):
                if len(v.strip()) == 0: print(f, path, '-> empty')
            elif isinstance(v, dict): yield from walk(v, path)
    for _ in walk(d): pass
"

# 5. Legal/privacy text — must review by hand
for f in src/i18n/messages/{de,fr,es,it,nl,ja,ko,zh-CN,zh-TW}.json; do
  echo "=== \$f ==="
  python3 -c "import json; d=json.load(open('\$f')); print(d['footer']['copyright'])"
done
```

## Known LibreTranslate artifacts (carryover from the previous pass on id.json)

To clean up before the paid pass:

```bash
# Inspect what's in id.json
diff src/i18n/messages/en.json src/i18n/messages/id.json | head -40
```

The previous LibreTranslate pass produced ~66 translated strings in
`id.json`, with 4 corrupted ones that were reverted to English. The
paid pass will re-translate everything from scratch (resumable; old
values are skipped only if they differ from the English source).

## Resumability

The script skips a string if the existing locale file already has a
value different from the English source. So you can stop and restart
mid-pass safely. Progress is saved every 20 strings to the locale
file on disk.

To re-translate a single string (force), edit the locale file to
match the English value, then re-run.

## Cost reference (June 2025 pricing)

| Provider | Cost per 196 × 22 strings | Notes |
|---|---|---|
| LibreTranslate | free | unreliable, MVP quality |
| DeepL Free | free | 500k chars/month cap |
| DeepL Pro | ~$0.05 | best for European |
| Google Cloud Translation | ~$0.10 | covers everything |
| Gemini 2.0 Flash | ~$0.02 | cheapest paid, slightly lower quality |

## Files

- `scripts/translate-messages.mjs` — the script
- `src/i18n/messages/en.json` — source of truth (196 strings)
- `src/i18n/messages/<locale>.json` — output, one per locale
