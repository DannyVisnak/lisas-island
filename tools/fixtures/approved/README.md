# Approved test fixtures

These files hold the expected values that the regression tests and the shop asset checker compare against. They are copies of approved content, kept here so the checks run from a plain checkout.

- `history-copy.tsv`, `history-vocab.tsv`, `english-rows.json`, `countries-metadata.json`: copied byte for byte from the approved sources.
- `formation-correction.json` and the files in `shop/`: only the fields the checks read are kept (formation geometry and renderer strings; shop SVG and CSS values and the historical rounds; exact CSS and note patches; expected audio paths). The JSON layout differs from the source documents. The kept values do not.

Rules:

1. A fixture changes only together with the approved app value it checks, by the same author, and with the same review.
2. Never change a fixture just to make a failing check pass.
3. A fixture file proves nothing about listening approval, visual acceptance, banknote clearance or release readiness.

Check from the repository root:

    python3 -m unittest tools/test_repo_portability.py

This copies the source files and fixtures into an empty folder, with no ticket documents, dependencies or audio. It blocks Node `readFileSync` calls on the original machine's home paths and runs the affected Node and Python checks there. The pending note and audio flags it passes only let this source-only run complete. They do not replace the asset, listening or visual gates.
