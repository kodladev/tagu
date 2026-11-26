# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.1.0] - 2026-11-26

### Added

- `htmlToAst` reads HTML into a tree of plain objects: template braces in tags, tags left open, raw `script` and `style` content, doctypes, positions as indexes or lines and columns
- `astToHtml` writes a tree back the way the source was written, or in the corrected form with `normalize`
- `visit` calls a function on every node, or one per node type
- `decodeEntities` and `encodeEntities`, kept out of the parser so the entity table is only bundled when used
- A `bench` folder that measures speed, memory, size and correctness next to other parsers

[0.1.0]: https://github.com/kodladev/tagu/releases/tag/v0.1.0
