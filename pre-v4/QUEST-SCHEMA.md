# KaiokenMS PRE V4 Quest Model

Quest records must be structured entities, not only guide text or external links.

Core fields:

• canonical ID and game quest ID
• name and aliases
• minimum and maximum level
• job requirements
• repeatable status
• starting NPC and ending NPC
• prerequisites
• previous and next quests
• required items and quantities
• required monsters and kill counts
• maps and locations
• ordered quest steps
• EXP, Fame, Mesos and item rewards
• source observations and confidence
• KaiokenMS override information when server behavior differs

Relations are stored separately and audited in both directions. Examples include Quest to NPC, Quest to Item, Quest to Monster, Quest to Map and Quest to Quest chain links.

The public Quest Guide may summarize or recommend quests. The Database will hold the factual entity record. Source conflicts and unresolved observations remain private in Supabase internal tables.
