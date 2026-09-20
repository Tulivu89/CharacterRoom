# CharacterRoom

A fork of AnotherRoom 1.1.5 by Triplis, shared with permission. Everything sent to the model is unchanged — identical context, tested against AnotherRoom every build. What's different is everything *around* that: a new interface, image gen, and a few added features.

Separate script, own script id — won't touch your AnotherRoom setup. Nothing migrates automatically; bring characters over via card export/import.

**The interface.** AnotherRoom's panels are gone, replaced by a single window.

**Images.** *(needs the bridge userscript)*
NovelAI scripts can't generate images or touch the network, so CharacterRoom ships a companion userscript (Violentmonkey) that generates and stores them: https://greasyfork.org/en/scripts/587717-character-engine-bridge-v3-0-36

- **Images live in IndexedDB**, not the story or the script.
- **Image generation**, portrait and emotion slots included.
- **The Illustrator** reads the last stretch of story, works out who's in it, and writes a scene prompt.
- **Wardrobe.** Toggleable outfit chunks per character — swap a look without retyping the prompt.
- **Photos mid-chat.** Your Contact can "send" a picture — described, generated, shown inline. ⚠️ needs the brain for it.
- **Chat bubbles.** Styled backgrounds, borders, corners, padding, glow — account defaults with per-Contact overrides.

**Stage mode.** A visual-novel reading of the chat.
- **The Scenario's banner is the backdrop**
- **Step through the story a paragraph at a time**

**Posts** — AnotherRoom's forum threads, rebuilt as a feed.
- **Two kinds**: about the chat, or your Contact's day away — measured from different anchors.
- **Dated**, on the chat's own clock.
- **Comments**, one press at a time — other Contacts, you, or strangers the model names.
- **Photos on posts**, re-generatable and editable.
- **Keep a post on the profile** to outlive the chat that made it.

**Time.**
- **The clock.** Added **story time** — a clock you move yourself. Undo rewinds it with the story.
- **Schedules** with a week view, and a status line that knows what your Contact is doing right now.

**Games.**
- **A dice system.** Build a roll out of dice, rows, resolution and result bands, or take a preset: **D&D 5e, Pathfinder 2e, Powered by the Apocalypse, Blades in the Dark, Chronicles of Darkness, Year Zero Engine, Call of Cthulhu 7e, Fate Accelerated.** Advantage, exploding dice and Fate's fudge dice are all in the model, and you can write your own ruleset from scratch.
- **Sheets per person**, the Contact, you, and every group member each get their own, with the ruleset's own stats and resources (hit points, Stress, Luck, Sanity, Willpower, Fate points, Inspiration) tracked and spendable.
- **Dice that land.** Real faces, a tumble, and odds ribbons showing what each band was actually worth before the die settled.
- **Your Contact reacts to the roll** in their own voice.

**Group chat.** *(experimental — needs a persona helper script per member)*
- **More than one Contact in the same chat**, each replying in their own voice.
- **Per-member portraits, bubbles and Stage figures.**
