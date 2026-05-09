-- Enable case- and accent-insensitive full-text search.
-- Used by src/lib/search.ts to match user queries against PostTranslation,
-- NewsTranslation, Episode and Guest content.
CREATE EXTENSION IF NOT EXISTS unaccent;
