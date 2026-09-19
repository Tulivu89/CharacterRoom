# CharacterRoom
A fork of AnotherRoom 1.1.5 by Triplis, shared with permission. Everything sent to the model is unchanged — identical context, tested against AnotherRoom every build. What's different is everything *around* that: a new interface, image gen, and a few added features.

Separate script, own script id — won't touch your AnotherRoom setup. Nothing migrates automatically; bring characters over via card export/import.

**The interface.** AnotherRoom's panels are gone, replaced by a single window.

**Images.** *(needs the bridge userscript)*
NovelAI scripts can't generate images or touch the network, so CharacterRoom ships a companion userscript (Violentmonkey) that generates and stores them:

- **Images live in IndexedDB, not the story/script**
- **Image generation**, portrait and emotion slots included.
- **The Illustrator** reads the last stretch of story, works out who's in it, and writes a scene prompt.
- **Photos mid-chat.** Your Contact can "send" a picture — described, generated, shown inline. ⚠️ needs the brain for it.
- **Chat bubbles.** Styled backgrounds, borders, corners, padding, glow — account defaults with per-Contact overrides.
- **Stage mode.** A visual-novel reading of chat, the Scenario's picture as backdrop.

**Posts** — AnotherRoom's forum threads, rebuilt as a feed.
- **Two kinds**: about the chat, or your Contact's day away — measured from different anchors.
- **Dated**, on the chat's own clock.
- **Comments**, one press at a time — other Contacts, you, or strangers the model names.
- **Photos on posts**, re-generatable and editable.
- **Keep a post on the profile** to outlive the chat that made it.
- **The clock.** Added **story time** — a clock you move yourself.
