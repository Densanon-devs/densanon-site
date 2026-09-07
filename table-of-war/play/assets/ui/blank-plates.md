# Blank plates — generated, not drawn

Every plate in `btn/blank/`, `hdr/blank/` and `pill/blank/` is **composed from parts** by
`tools/art/build_plate_set.py`. Nothing here is hand-delivered art any more, and nothing should be
dropped in by hand — a file placed here will be overwritten on the next run.

```
python tools/art/build_plate_set.py --install     # writes all 103 blanks + app/tools/plate-regions.json
cd app && npm run gen:plates                      # folds both into public/plates.js
```

That is the whole loop. `--install` writes the art *and* the label regions; `gen:plates` publishes
them to the runtime. Run the second whenever you run the first, or `npm run i18n:check` will fail.

## What a plate is made of

| piece | source | tuned by |
|---|---|---|
| 9-slice frame + tintable fill | `plate/` (cut from `app/tools/plate-sheet.png`) | `app/tools/plate.json` |
| medallion | `icon/` (65, cut from the symbol sheets) | `tools/art/plate-icons.json` |
| value well | `nsplaque.png` | — |
| label | `glyph/` atlas, drawn at runtime through `t()` | `tools/art/plate-tints.json` for colour |
| wear | `plate/grime.png`, `plate/grime_frame.png` | `plate.json` → `grime` |
| the arch (all 32 headers) | `plate/arch.png` | — |

Re-cut the frame from a new sheet with `tools/art/import_plate_parts.py --sheet <png>`; it applies
`plate.json`'s `slice` deltas so a cut adjusted by eye in the browser is the cut written to disk.

## Tuning

`app/tools/plate-composer.html` is the tuner — `npm run dev`, then `/tools/plate-composer.html`. It
reads `app/tools/plate.json` as its starting point and **Copy JSON** gives you the file back. There is
a phone-usable copy of it published as a Claude artifact, fully self-contained.

## The label region is COMPUTED

This is the part worth understanding before touching anything. A label's box used to be six family
defaults plus eighteen hand-measured escapes in `PLATE_REGION_OVERRIDE`, because drawn art cannot tell
you where its own fill is — so every plate was eyeballed, and re-eyeballed whenever the art moved.

The tool that draws the plate knows the fill rect, the medallion and the well to the pixel, so the box
is a subtraction rather than a guess. It travels with the art in `plate-regions.json` and reaches the
runtime as `window.PLATE_REGION_GEN`, and the two cannot drift apart.

`PLATE_REGION_OVERRIDE` still exists and still wins, deliberately: `tools/plate-tuner.html` exports
into it, and a plate that needs nudging after the fact should have somewhere to be nudged. It is empty
because its old contents were measured against art that no longer exists.

## Requirements, if you ever do hand-deliver a plate

- **Native resolution.** Same pixel dimensions as the original — `PLATE_SIZE` is read from these files.
- **Keep the alpha.** The plates have soft drop shadows; flattening them shows as a dark rectangle.
- **Leave the medallion and the value well alone.** Only the word comes out.
- Then add its region to `PLATE_REGION_OVERRIDE`, since nothing will compute one for it.

`scripts/import-blank-plates.mjs` is the superseded importer for that case — it patches only the
rectangle where the word was, at native resolution, rather than rescaling a whole plate.

## Which files

103 plates carry a word: 65 `btn`, 32 `hdr`, 6 `pill`. The list with each plate's English is
`app/src/locales/en.json` under `plate.*`.

`hdr/table_of_war.png` is deliberately NOT among them. It is the game's name, not a label — it has no
key, and the code refuses a blank for it even if one is present.
