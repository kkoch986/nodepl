

# Abstract Syntaxt Tree

## Primitive Types
The AST will support the following primitive types:

- `String`
- `Number`
- `Variable`

## Lists

__TODO.__

## Statements

A program is represented by an array of statements. A statement is
either a `Fact` or a `Rule`.

### Facts

A fact is composed of 2 parts, a `head` and a `body`.

The `head` will be simply a JS string, which is represented in the grammar as
either a `string_literal` or an `id`. Potentially in future iterations this
could also be a `variable_name`.

The `body` is represented as an array of `arguments` which should be one of the
following AST entities: `String`, `Number`, `Variable`, `Fact`, `List`.

### Rules

Rules are of the form `FACT :- FACT,FACT,FACT` for instance `and(A,B) :- c(A), d(B).`.
This means that `and(A,B)` implies `c(A)` and `d(B)`. Rules are made up of two
parts in the AST, the `head` and the `body`. The head should be a `FACT` and the
body should be an array of `FACT`s.

### Concatenation

__TODO.__

### Infix

__TODO.__

## Examples

### Basic Facts

The fact `a(b).` would result in the following AST:

```
FACT(
	STRING("a"),
	[ STRING("b") ]
)
```

Something like `a(b,1).` would just have another argument in the body:

```
FACT(
	STRING("a"),
	[ STRING("b"), NUMBER(1) ]
)
```

You could also include variables like `a(B,c).`:

```
FACT(
	STRING("a"),
	[ VARIABLE("B"), STRING("c") ]
)
```

Complex terms are also supported: `a(b(c), d).` for instance:

```
FACT(
	STRING("a"),
	[
		FACT(
			STRING("b"),
			[ STRING("c") ]
		),
		STRING("d")
	]
)
```

### Rules

`and(A,B) :- c(A), d(B).` would be represented as:

```
RULE(
	FACT(
		STRING("and"),
		[ VARIABLE("A"), VARIABLE("B") ]
	),
	[
		FACT(STRING("c"), [ VARIABLE("A") ]),
		FACT(STRING("d"), [ VARIABLE("B") ])
	]
)
```

__TODO__: understand complex terms in the head of a rule. This is probably nonsense
		so need to make sure the grammer or interpreter disallows this.

## Concatenation

__TODO.__
