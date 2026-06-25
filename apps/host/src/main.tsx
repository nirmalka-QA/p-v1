// Module Federation requires an async boundary at the entry: deferring the real
// start into ./bootstrap lets shared singletons (React, the store, the theme)
// initialise before any remote consumes them. Keep this file a one-liner.
import('./bootstrap')
