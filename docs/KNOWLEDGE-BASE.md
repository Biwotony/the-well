# Alignment with THE WELL

This knowledge package follows the architecture established for THE WELL:

- Supabase remains the low-cost system of record for magic-link authentication, private source storage, metadata, and vector retrieval.
- GitHub stores code, configuration, migrations, and reproducible ingestion tooling. It does not store copyrighted books or the raw production corpus.
- User-facing agents retrieve only from policy-approved tiers. Scripture has the highest retrieval weight; historical books are explicitly labeled and down-ranked.
- Sexuality, divorce, conflict, and parenting content is filtered through consent, abuse-safety, child-safeguarding, medical, legal, and theological review tags.
- The modern copyrighted reference is blocked from extraction and embeddings until its authorization explicitly permits AI ingestion and commercial application use.
- The free built-in `gte-small` embedding model is used to minimize operating cost. The database schema expects 384-dimensional vectors.
- The existing Story Intelligence and Content Factory agents may retrieve approved knowledge through the server-only match function. They still create private recommendations or drafts and cannot publish.

## Agent boundaries

1. The retrieval agent may query only `production_rag` by default.
2. The research agent may opt into `historical_rag` while labeling the material as historical.
3. `restricted_research` is never available to ordinary user conversations.
4. `narrative_only` may support empathy and discussion prompts, but never medical, legal, psychological, or pastoral instructions.
5. Safety-critical situations bypass book retrieval and follow THE WELL's escalation policy.

## Remaining deployment dependency

The connected database project is inactive and is not yet explicitly identified as THE WELL's production project. Database and storage deployment must wait until the intended Supabase project is active and confirmed.

