-- Which part of a home a photo shows (living room, bedroom, kitchen, bathroom, balcony), so guests can browse photos by area.
-- Empty means "not set": the site then tries to guess from the photo's caption.
ALTER TABLE catalog_images ADD COLUMN area text NOT NULL DEFAULT '';
