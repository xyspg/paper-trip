# Noto Sans SC for the ledger statement PDF

`NotoSansSC-Regular.ttf` and `NotoSansSC-Bold.ttf` are static instances of the
open-source Noto Sans SC variable TrueType font. The ledger export embeds them
(subsetted to the glyphs used) as the statement's real text faces, and also
registers the same bytes as a web font so the off-screen layout it measures
matches the PDF glyph for glyph. Noto Sans CJK and Adobe Source Han Sans share
the same upstream CJK typeface work.

jsPDF embeds TrueType outlines without variation tables, and the variable
font's default instance is Thin (wght 100), so each weight is instanced ahead
of time with fontTools:

```
uvx --from fonttools fonttools varLib.instancer --update-name-table \
  -o NotoSansSC-Regular.ttf NotoSansSC-VF.ttf wght=400
uvx --from fonttools fonttools varLib.instancer --update-name-table \
  -o NotoSansSC-Bold.ttf NotoSansSC-VF.ttf wght=700
```

Source of `NotoSansSC-VF.ttf` (not kept in the repo):
https://github.com/google/fonts/tree/main/ofl/notosanssc, downloaded
2026-08-25, SHA-256
`a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`.

License: SIL Open Font License 1.1, reproduced in `NotoSansSC-OFL.txt`.

Instanced 2026-09-04. SHA-256:

- `NotoSansSC-Regular.ttf` `e1c3993a41642f2cad2cf779cd4c13c78e0996d3720c12b446d6d78b370cbbd0`
- `NotoSansSC-Bold.ttf` `f21bb4e99923fa8dff064b7d2c39da53e4028a422cefae0b3b2c0738351a784b`
