# WAR TABLE — Medal art

Drop medal badges here. **Filename must equal the medal's id** (exact), e.g.
`war_bonds.png`. Shown in menus (draft / showcase / earned popup), NOT on the
board — so **full color is fine** (award-badge look). Falls back to the 🎖 emoji
for any not yet drawn.

## Spec
- **Format:** `.png` (or `.svg`), transparent background, square, ~256px.
- **Style:** full-color medal / badge / insignia. A consistent frame (e.g. circular
  medal with ribbon, or a shield insignia) across all 12 reads best.
- **Filename = id.**
- Optional `medals.png` = generic ribbon/medal for the 🎖 showcase button.

## Roster (12)
### Pool 1 — after Level 1
| id (filename)     | medal            | effect                          | idea                       |
|-------------------|------------------|---------------------------------|----------------------------|
| field_manual      | Field Manual     | +1 max hand size                | open field manual / book   |
| war_bonds         | War Bonds        | +1 Command Point / turn         | bond certificate / seal    |
| recruitment_drive | Recruitment Drive| +2 supply cap                   | recruitment poster/megaphone|
| salvage_teams     | Salvage Teams    | +1 card on clearing a crate     | crate + salvage hook       |

### Pool 2 — after Level 2
| id                | medal            | effect                          | idea                       |
|-------------------|------------------|---------------------------------|----------------------------|
| combat_engineers  | Combat Engineers | Build cards cost 1 less         | hard hat + wrench          |
| veteran_corps     | Veteran Corps    | Deployed units +3 HP            | chevron stripes / vet badge|
| forward_scouts    | Forward Scouts   | +1 sight range                  | binoculars / eye           |
| war_academy       | War Academy      | 2x XP gain                      | officer cap + laurel       |

### Pool 3 — after Level 3
| id                | medal            | effect                          | idea                       |
|-------------------|------------------|---------------------------------|----------------------------|
| iron_fortress     | Iron Fortress    | HQ +40 max HP                   | shield / fortress          |
| artillery_doctrine| Artillery Doctrine| Ordnance +4 damage             | cannon / shell burst       |
| blitz_doctrine    | Blitz Doctrine   | Units +1 move                   | lightning bolt / winged boot|
| spec_ops          | Spec Ops         | Flanking bonus +4 (from +2)     | dagger / spec-forces insignia|

When any files are in place, ask Claude to wire them — medal draft, showcase,
earned popup, and the 🎖 buttons will use your art with emoji fallback.
