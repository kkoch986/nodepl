

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
- [ ] unify complex terms (engine.js:203)
- [ ] handle syntax errors in query mode without crashing
- [ ] allow partial query entering in query mode.
- [ ] lists / syntactic sugar hooks
- [x] clean up code from before my latest major refactoring
- [ ] actual documentation
- [ ] handle queries in the source files (already enabled in the parser)
- [ ] unit testing
- [ ] lots of examples / profiling
- [ ] support for comments in the code
