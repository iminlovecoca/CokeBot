# CokeBot RPG Weapon Handoff

- Phase/status: Content integration complete; awaiting deployment/release smoke test.
- Goal: Add a normal hammer that can branch into a physical/ARC Thor weapon or a magic/ARC Odin weapon without breaking existing enhancement data.
- Latest work: Added Warhammer/Búa Rèn, generated its transparent asset, added `evolveweapon` with confirmation buttons, and aligned Odin to INT (S) + ARC (A) + STR (B).
- Important files: `utils/rpgUtil.js`, `data/rpg/weaponEvolutions.js`, `utils/weaponEvolutionUtil.js`, `commands/rpg/user/evolveweapon.js`, `commands/admin/feature/weaponlist.js`, `commands/admin/git/dir.js`, `assets/items/Weapon/`.
- Verification: `node --check` passed for all touched JavaScript modules; module-load, Búa Rèn generation, both evolution branches, image mapping, asset size/alpha checks, and `git diff --check` passed.
- Known risk: Evolution is one-way and currently requires exactly +10 enhancement, 250,000 Coke, and one Somber-9; the target weapons remain available to Admin through `addgear`.
- Next safest task: Run the new command on a staging Discord account and confirm the button interaction, inventory deduction, equipment preservation, and power recalculation.
