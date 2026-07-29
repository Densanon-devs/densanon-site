# TABLE OF WAR — Unit art

Drop your unit symbols here. **Filename must equal the unit's id** (exact), e.g.
`rifleman.svg`, `light_tank.png`. The engine draws the colored counter, HP bar,
attack number, and veteran pips *around* the art — you only draw the symbol.

## Spec
- **Format:** `.svg` preferred (crisp at any zoom). `.png` OK — 256×256, transparent, square.
- **Style:** bold dark silhouette (ink `#241d10`) on a transparent background — it sits
  on a cream tile. WWII recognition-silhouette / NATO-counter vibe. Must read at ~20–30px,
  so keep detail minimal.
- **Safe area:** centered, ~10% padding. No background / border / color chip — the counter
  supplies those.
- Faction-agnostic: one file per unit works for you (blue), enemy (red), tribe (olive),
  neutral (grey). (Per-faction overrides possible later: `rifleman.enemy.svg`.)

## Roster (16)
| id (filename)      | unit             | draw                                             | sides            |
|--------------------|------------------|--------------------------------------------------|------------------|
| rifleman           | Rifleman         | infantry with rifle                              | you, enemy       |
| rocket_soldier     | Rocket Soldier   | soldier with shoulder rocket launcher            | you, enemy       |
| light_tank         | Light Tank       | small tank, side profile                         | you, enemy       |
| heavy_tank         | Heavy Tank       | large tank, thick barrel                         | you, enemy       |
| artillery          | Artillery        | long-barrel gun raised (range 2-4)               | you, enemy       |
| attack_dog         | Attack Dog       | dog / fast recon scout                           | you, enemy       |
| tribe_warrior      | Tribe Warrior    | melee fighter (spear/club)                        | tribe            |
| command_vehicle    | Command Vehicle  | mobile HQ truck/APC with antenna (nomad HQ)      | you              |
| construction_yard  | Construction Yard| HQ building / base with flag                     | you, enemy       |
| power_plant        | Power Plant      | reactor / power building (+CP)                    | you              |
| supply_depot       | Supply Depot     | crates / warehouse (+card draw)                   | you              |
| barracks           | Barracks         | tent / barracks building (+supply)               | you              |
| repair_bay         | Repair Bay       | wrench / garage (heals adjacent)                 | you              |
| outpost            | Outpost          | flag / watchtower (neutral, capturable)          | neutral, you, enemy |
| turret             | Turret           | fixed gun emplacement / bunker (range 1-3)       | you, enemy       |
| tribe_camp         | Tribe Camp       | teepee / hut cluster / totem                     | tribe            |

When any files are in place, ask Claude to wire them up — the counter will use your image
and fall back to the built-in placeholder SVG for anything not yet drawn.
