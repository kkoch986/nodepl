

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

Contributions are super welcome!

## TODO / Roadmap

### Core Language Improvements
- [ ] better document where hooks are to add standard predicates with special handling.
    - [ ] ! (cut)
    - [ ] <,>,<=,>=
    - [ ] integer mod operator
    - [x] fail predicate
    - [x] basic number math
        - [x] if a math expr is encountered and its not a bound number print a warning and fail that evaluation
	    - note: due to parser limitations, math expressions must all be binary and encased in parens (i.e. (1+2)+3 and not 1+2+3)
	- [x] write/writeln/printf?
- [ ] plan for easy extendability (maybe a library for rand() could be a good starting point)
- [ ] engine / compiler directives (`%-` or something)
- [ ] add support for 0-ary predicates (as `a` instead of `a()`)
- [ ] handle queries in the source files (already enabled in the parser)
- [x] support for comments in the code
- [x] unify complex terms (engine.js:203)
- [x] lists
- [x] clean up code from before my latest major refactoring

### Performance
- [ ] value-based indexing strategies
    - [ ] i.e. other prologs by default index the first value so you can quickly lookup potential matches when the first arg is bound.
    - [ ] provide the ability in a compiler directive to drive how certain predicates should be indexed.
    - [ ] when resolving try to pick the best index to use based on the query.
- [ ] on-disk B-Tree indexing
- [ ] lots of profiling
    - [ ] particularly around huge datasets / rdf

### Query Shell Improvements
- [ ] preserve previous query shell history (so you can press up and see commends you ran last time)
- [ ] handle syntax errors in query mode without crashing
- [ ] allow partial query entering in query mode.
- [ ] dynamically load and index rule files (`?- [filename].`)
    - will require a runtime indexer which can index multiple files
- [ ] autocomplete in query shell

### Other
- [ ] fix handling of `_` (should always be anonymous)
- [ ] actual documentation
- [ ] unit testing
- [ ] lots of examples
- [ ] a more robust logging set up (log4js?)
    - partially complete, using `debug` now (`npm install debug`)
- [ ] ability to use as a library in JS code.
- [ ] potential example programs
    - [ ] "bacon number" type game where you can provide any 2 people and get the distance between them.
    - [ ] automatic 4 part harmonizer (take a melody and provide harmonization options)
    - [ ] billion triples challenge
