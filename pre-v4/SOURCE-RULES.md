# KaiokenMS PRE V4 Source Rules

Public site data is resolved by field, not by one global source.

1. KaiokenMS confirmed server behavior always wins over vanilla data.
2. BBB / Hidden Street is the current preferred source for explicit equipment stat ranges and classic quest relationships.
3. GMS v83 WZ is the canonical base for IDs, names, raw fields and primary vanilla assets.
4. Cosmic is used for structured drops and shop relationships, then cross checked.
5. MapleStory.IO is primarily an image and rendering fallback.
6. MapleStory Wiki is supplementary. Sell price can be selected from it where explicitly approved.
7. Conflicting observations are preserved internally. They are never shown on the public site unless an explicit public explanation is later approved.

Conflict and audit tables live in the private Supabase internal schema. No anon or authenticated grants are present.
