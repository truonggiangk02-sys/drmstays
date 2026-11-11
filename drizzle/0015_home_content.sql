-- Home page wording the owner can edit (any key left out keeps its default text).
CREATE TABLE IF NOT EXISTS home_texts (
  key text NOT NULL,
  lang text NOT NULL,
  value text NOT NULL DEFAULT '',
  PRIMARY KEY (key, lang)
);
