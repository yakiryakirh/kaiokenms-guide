# KaiokenMS PRE V4 Supabase Foundation

The connected Supabase project has a private `internal` schema for PRE V4 master data and audit work.

Created private structures:

• source registry and per field source priority
• typed canonical entity registry
• source observations
• private conflict records
• entity relations and inverse relation audit rules
• image assets and image audit runs
• structured quest records

Access boundary:

`public`, `anon` and `authenticated` have no grants on the internal schema or its conflict and audit data. The service role is the maintenance path. Public pages continue to use purpose built public data only.

Applied migrations:

`pre_v4_internal_foundation`
`pre_v4_internal_audit_rules`

Do not move conflict tables or raw source observations into the public schema when V4 is eventually built. Instead create reviewed public read models containing only resolved values needed by the site.
