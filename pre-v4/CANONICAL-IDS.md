# KaiokenMS PRE V4 Canonical IDs

Every entity gets a typed canonical identifier so unrelated entities can never collide even when their numeric IDs match.

Examples:

`item:1050030`
`equipment:1050030`
`monster:9300003`
`npc:2010006`
`map:211000000`
`quest:1001`
`job:200`
`skill:2001002`
`reactor:2000`
`hair:30000`
`face:20000`

KaiokenMS entities that do not have a stable vanilla numeric ID use a stable server namespace such as `kaioken:master-roshi` or `kaioken:dragon-ball-1`.

Rules:

1. Never use a bare numeric ID as the primary identity.
2. Entity links store canonical IDs, not display names.
3. Display names and aliases can change without breaking relations.
4. Images are attached to canonical IDs and have their own image kind and source.
5. KaiokenMS overrides never delete the vanilla observation. They only become the preferred resolved value.
6. Hair and Face are distinct entity types and never share identity with normal Items.
