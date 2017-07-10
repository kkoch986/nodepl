

# NodePL

NodePL is a Datalog/Prolog-esque language implemented in ES6.
The goal is to build a modern prolog, with a few objectives:

1. __Be legible__ (most prologs are implemented in C and use complex virtual machines).
The point of this goal is to allow people to easily learn and understand the
basics of logic programming in a less intimidating form factor.
1. __Be extendable.__ As an extension of the first goal, i'd like this prolog to be
very easily extendable to allow molding logic programming to fit more modern needs.
1. __Be asynchronous.__ This is a little less thought out than the others but i've
made extensive use of ES6 generators which should enable incremental resolution
of queries. This opens a lot of doors, like running huge queries or queries on large
datasets and getting results without waiting for the entire result to be calculated.
Also we can run queries which generally end in infinite loops for normal prolog
and just step through until we don't care anymore.

Being fast would be a nice bonus...

## TODO:
- [ ] better document where hooks are to add standard predicates with special handling.
    - [x] fail predicate
    - [ ] ! (cut)
	- [ ] <,>,<=,>=
    - [x] basic number math
	    - note: due to parser limitations, math expressions must all be binary and encased in parens (i.e. (1+2)+3 and not 1+2+3)
	- [x] write/writeln/printf?
- [ ] dynamically load and index rule files (`?- [filename].`)
    - will require a runtime indexer which can index multiple files
- [ ] fix handling of `_` (should always be anonymous)
- [ ] add support for 0-ary predicates (as `a` instead of `a()`)
- [ ] handle syntax errors in query mode without crashing
- [ ] allow partial query entering in query mode.
- [ ] actual documentation
- [ ] unit testing
- [ ] lots of examples / profiling
- [ ] handle queries in the source files (already enabled in the parser)
- [ ] support for comments in the code
- [ ] a more robust logging set up (log4js?)
    - partially complete, using `debug` now (`npm install debug`)
- [ ] engine / compiler directives (`%-` or something)
- [x] unify complex terms (engine.js:203)
- [x] lists
- [x] clean up code from before my latest major refactoring
