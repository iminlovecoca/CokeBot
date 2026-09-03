# CokeBot RPG Weapon Handoff

- Phase/status: Runtime syntax fix complete; awaiting deployment/restart smoke test.
- Goal: Add a normal hammer that can branch into a physical/ARC Thor weapon or a magic/ARC Odin weapon without breaking existing enhancement data.
- Latest work: Added Warhammer/Búa Rèn, generated its transparent asset, added `evolveweapon` with confirmation buttons, aligned Odin to INT (S) + ARC (A) + STR (B), and repaired the missing `satan` object closure in `weaponPassives.js`.
- Important files: `utils/rpgUtil.js`, `data/rpg/weaponEvolutions.js`, `utils/weaponEvolutionUtil.js`, `commands/rpg/user/evolveweapon.js`, `commands/admin/feature/weaponlist.js`, `commands/admin/git/dir.js`, `assets/items/Weapon/`.
- Verification: `node --check` and RPG module-load passed; Búa Rèn generation, both evolution branches, all new weapon passive smoke tests, image mapping, asset size/alpha checks, and `git diff --check` passed.
- Known risk: Evolution is one-way and currently requires exactly +10 enhancement, 250,000 Coke, and one Somber-9; the target weapons remain available to Admin through `addgear`.
- Next safest task: Deploy the corrected `weaponPassives.js` to `/home/coca/CokeBot`, restart PM2, and confirm the bot no longer crashes during module loading.
