# Audio — where the clips go

**Drop files in this folder, run `npm run gen:audio`, rebuild. That's the whole process.**

Every cue already has a synthesized voice, so the game is never silent and works with this folder
empty. A recorded clip *overrides* the synth for that one cue the moment it appears in the manifest —
you can deliver the set one file at a time and hear each land without touching any code.

```
app/public/assets/audio/
  manifest.json      generated — do not hand-edit
  sfx_ui_tap.wav     SFX: 48 kHz mono 16-bit WAV
  sfx_card_play.wav
  mus_battle.m4a     music: AAC-LC, 96 kbps stereo
  ...
```

## Naming — the filename IS the wiring

| Kind | Filename | Notes |
|---|---|---|
| Sound effect | `sfx_<cue>.wav` | `<cue>` must exactly match a cue name below |
| Music bed | `mus_<mode>.m4a` | mode ∈ `main` `campaign` `battle` `boss` `safe` |
| Variation | `sfx_<cue>_v2.wav`, `_v3` … | picked at random; `_v1` and the bare name are the same slot |
| Music **layer** | `mus_<mode>_<layer>.m4a` | plays *on top of* `mus_<mode>`, in sync — see below |
| Extra **song** | `mus_<mode>_v2.m4a`, `_v3` … | another song for the same mode; one is picked per visit |
| A song's layer | `mus_<mode>_v2_<layer>.m4a` | that song's own layer |

A file whose cue name is not in the list below is **ignored with a warning** by `gen:audio` — that is
deliberate, so a typo fails loudly at build time instead of silently never playing.

## Format

- **SFX: 48 kHz mono 16-bit WAV.** Not compressed, on purpose. AAC carries 20–45 ms of encoder priming
  delay, which is inaudible on a stinger but softens the attack on a 40 ms click and makes the whole
  interface feel late. WAV also removes any dependence on a decoder honouring gapless metadata.
- **Music: AAC-LC `.m4a`, 96 kbps stereo.** AAC is the only lossy codec that decodes on all five
  targets — WebView2, Android System WebView, and **WKWebView on both iOS and macOS**. Ogg/Opus would
  silently ship a Mac and iOS build with no music.
- Loudness: SFX −16 LUFS, music −18 LUFS integrated, true peak ≤ −1 dBTP.
- Loops: music must loop seamlessly. If a bed needs explicit loop points, put them in `loops.json`
  here as `{"battle": {"loopStart": 2.0, "loopEnd": 94.5}}` (seconds) and `gen:audio` folds them into
  the manifest. The player sets them on the buffer, which is sample-accurate.

## The cues

42 in total. Full descriptions of what each should sound like are in `docs/AUDIO_BRIEF.md`.

**Interface (6)** `ui_tap` `ui_back` `ui_open` `ui_close` `ui_error` `ui_coin`

**Cards (6)** `card_draw` `card_play` `card_shuffle` `card_upgrade` `card_remove` `card_curse`

**Units (14)** `move_infantry` `move_vehicle` `move_heavy` `unit_deploy` `fire_light` `fire_heavy`
`fire_energy` `fire_launch` `impact_flesh` `impact_metal` `explode_small` `explode_large` `death_unit`
`death_structure`

**Structures & orders (4)** `build_place` `power_charge` `heal_repair` `buff_apply`

**Battle flow (6)** `turn_player` `turn_enemy` `objective_tick` `objective_lost` `alert` `reveal`

**Progression (6)** `unlock` `unlock_tail` `acquire` `rank_up` `run_win` `run_lose`

`unlock_tail` is layered *on top of* `unlock` for the higher tiers — it is never played alone.

## Music layers (stems)

A bed can ship extra files that are the **same music scored for different weight**. They are not
alternates to switch between: every layer starts on the same sample as the base, loops with it, and
sits silent until the game fades it up. That is what lets the score follow a fight without restarting.

Three layers exist, because three are driven by game state:

| File | Plays over | Rises when |
|---|---|---|
| `mus_battle_desperate.m4a` | `mus_battle.m4a` | your HQ is ground down — nothing above 70% health, full by 25% |
| `mus_boss_desperate.m4a` | `mus_boss.m4a` | the same, during a boss fight |
| `mus_boss_enraged.m4a` | `mus_boss.m4a` | the boss turns |

The boss bed can carry BOTH: `desperate` tracks how you are doing, `enraged` tracks what he is doing,
and they are independent — all four combinations happen.

## Several songs for one mode

A mode can ship more than one song. Number them `_v2`, `_v3` and so on; `mus_battle.m4a` is song 1.
One is chosen when you enter that mode — at random, but never the same one twice running — and it
plays for the whole battle rather than reshuffling mid-fight. Each song carries its own layers:

```
mus_battle.m4a               song 1
mus_battle_desperate.m4a     song 1's layer
mus_battle_v2.m4a            song 2
mus_battle_v2_desperate.m4a  song 2's layer
mus_battle_v3.m4a            song 3
```

Numbering must not skip — a `_v3` with no `_v2` is reported. Loop points, if a song needs them, go in
`loops.json` keyed by the file's own name: `{"mus_battle_v2": {"loopStart": 2.0, "loopEnd": 94.5}}`.

`gen:audio` **rejects any other layer name** rather than shipping a file that would never be heard.

Three rules make layers work, and they are all on the composer:

1. **Identical length and tempo**, starting on the same sample. The engine starts them together and
   never re-syncs.
2. **The base must sound finished on its own.** It plays alone most of the time.
3. **Mix the pair as a pair.** Two independently-mastered files that happen to be the same length will
   sum to something louder and muddier than either.

A layer with no base bed under it is rejected — it cannot sound on its own.

## Paid vs demo

`mus_boss` is **paid content** and is stripped from the free web demo by
`scripts/prune-demo-assets.ts`. Anything else added here that should not reach the demo must be added
to that script's rule, or the demo will ship it.
