# KaiokenMS PRE V4 Execution Checklist

Current order of work:

1. Finish image resolution and create a final image audit.
2. Import structured Quest data and link NPCs, Items, Monsters, Maps and Quest chains.
3. Complete the NPC relationship layer and attach preferred NPC images.
4. Complete map contents and portal relationships.
5. Import BBB explicit equipment stat ranges as the current preferred vanilla stat source.
6. Cross check Drops, Shops, Available From and Used For relationships.
7. Run private conflict detection and inverse relation audits.
8. Build public read models only after the private master data passes coverage checks.
9. Apply the approved site corrections: live Quest suggestions, internal Quest details, numbered Database pagination, compact desktop Home, and move Events, Useful NPCs and KaiokenMS Systems into Main Guide.
10. Only after all of the above passes review should Database V4 begin.

Public boundary:

The public site must never expose internal source observations, unresolved conflicts, UUIDs, raw metadata, audit records or source resolution mechanics. Those remain maintenance data only.
