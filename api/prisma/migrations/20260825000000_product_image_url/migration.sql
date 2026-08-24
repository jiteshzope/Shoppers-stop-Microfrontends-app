-- Product photos moved from files bundled with the API to absolute URLs on an
-- image host. The column is renamed rather than dropped and re-added so the
-- existing rows survive; the seed rewrites the values on its next run.
ALTER TABLE "products" RENAME COLUMN "image_path" TO "image_url";
