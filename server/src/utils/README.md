# utils/

Small, pure, side-effect-free helpers with no knowledge of Express or
Mongoose (e.g. the logger instance, date/duration formatting, YouTube
ID/URL parsing once Phase 4 lands). If a function needs `req`/`res` it's
middleware or a controller, not a util.
