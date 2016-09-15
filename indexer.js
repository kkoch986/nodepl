require('babel-polyfill');
import fs from "fs"
import JSParse from "js-parse";
const Parser = JSParse.Parser.LRParser;

// TODO: correctly handle String and numeric literals
// TODO: refactor literals and ids, theres some confusion right now where
// 		literals are more deeply nested than ids and they are trying to unify and failing
// TODO: Figure out complex terms

/**
 * Take statements from the parser and store them in some kind of structure
 * eventually this structure will be used for querying by the runtime
 **/
export default class Indexer {
	constructor() {
		this.index = {};
		this.nextVariableIndex = 1;
	}

	/**
	 * Index the given statement
	 **/
	indexStatement(statement) {
		switch(statement.head) {
			case "fact":
				return this.indexFact(statement.body);
			case "rule":
				return this.indexRule(statement.body);
			default:
				throw "Unknown statement type: " + statement.head;
		}
	}

	/**
	 * Index a FACT statement
	 **/
	indexFact(statement) {
		const symbol = statement[0].value;
		const args = statement[1].body;
		this.anonymizeVariables(args);

		const arity = args.length;
		if(!this.index[symbol + "/" + arity]) {
			this.index[symbol + "/" + arity] = [];
		}
		this.index[symbol + "/" + arity].push({"type": "fact", "body": args});
	}

	/**
	 * Index a RULE statement
	 */
	indexRule(statement) {
		const index = {type: "rule"};

		// figure out where to put it
		const head = statement[0].body;
		const symbol = head[0].value;
		const arity = head[1].body.length;

		// anonymize the variables in the head
		let mapping = this.anonymizeVariables(head[1].body);
		index.head = head[1].body;

		const body = statement[1].body;
		index.body = [];
		for(let i in body) {
			mapping = this.anonymizeVariables(body[i].body[1].body, mapping);
			index.body.push(body[i].body);
		}

		if(!this.index[symbol + "/" + arity]) {
			this.index[symbol + "/" + arity] = [];
		}
		this.index[symbol + "/" + arity].push(index);
 	}

	/**
	 * Convert all variables in the given structure to anonymous names
	 **/
	anonymizeVariables(obj,mapped={}) {
		if(obj.type && obj.type === "variable_name") {
			if(!mapped[obj.value]) {
				mapped[obj.value] = "_h" + (this.nextVariableIndex++);
			}
			obj.value = mapped[obj.value];
			return mapped;
		} else if(obj.length) {
			for(var i in obj) {
				mapped = this.anonymizeVariables(obj[i], mapped);
			}

			return mapped;
		}

		return mapped;
	}

	/**
	 * Write this index to a file.
	 **/
	serialize(file) {
		return new Promise((accept, reject) => {
			fs.writeFile(file, JSON.stringify(this.index), function(err) {
				if(err) {
					reject(err);
				} else {
					accept();
				}
			});
		});
	}

	/**
	 * Rebuild the index from a json file
	 **/
	deserializeFromFile(file) {
		return new Promise((accept, reject) => {
			fs.readFile(file, "ascii", (err,data) => {
				if (err) {
					reject(err);
				}
				this.deserialize(JSON.parse(data));
				accept();
			});
		});
	}

	/**
	 * Rebuild the index from an object
	 **/
	deserialize(obj) {
		this.index = obj;
	}

	/**
	 * Resolve a query statement
	 **/
	*resolveStatement(statement, bindings=[{}]) {
		console.verbose("[ResolveStatement]", statement);
		switch(statement.head) {
			case "statement":
				for(let r of this.resolveStatements(statement.body, bindings)) {
					yield r;
				}
				break ;
			case "fact":
				for(let r of this.resolveFact(statement.body, bindings)) {
					yield r;
				}
				break ;
			default:
				throw "Unknown statement type: " + statement.head;
		}
	}

	/**
	 *  Resolve an array of statements
	 */
	*resolveStatements(statements, bindings=[{}]) {
		console.verbose("[ResolveStatements]", statements);
		// if there are no statements left, just return whatever bindings we
		// already have.
		if(statements.length === 0) {
			for(let b in bindings) {
				yield bindings[b];
			}
			return ;
		}

		// for each of the bindings given here we need to try everything
		for(let b in bindings) {
			// now find all of the results for the first statement
			const binding = Object.assign({}, bindings[b]);
			for(let r of this.resolveStatement(statements[0], [binding])) {
				// now call resolveStatements with this binding
				// and the tail of statements
				for(let r2 of this.resolveStatements(statements.slice(1), [r])) {
					yield r2;
				}
			}
		}
	}

	/**
	 * Resolve a fact query
	 **/
	*resolveFact(statement, bindings=[{}]) {
		const symbol = statement[0].value;
		const args = statement[1].body;
		const arity = args.length;
		console.verbose("[ResolveFact]", symbol, args);

		if(this.index[symbol + "/" + arity]) {
			for(let i in this.index[symbol + "/" + arity]) {
				const element = Object.assign({}, this.index[symbol + "/" + arity][i]);
				switch(element.type) {
					case "fact":
						for(let b in bindings) {
							let res = this.unify(element.body, args, bindings[b]);
							if(res) {
								yield res;
							}
						}
						break ;
					case "rule":
						for(let b in bindings) {
							// Unify the head of the statement against the bindings
							let binding = this.unifyArray(statement[1].body, element.head, bindings[b]);
							for(let result of this.resolveStatements(element.body.map(i => { return {head: "fact", body: i}; }), [binding])) {
								yield result;
							}
						}
						break ;
					default:
						throw "Unknown index element type: " + element.type;
				}
			}
		}
	}

	/**
	 * Take the given thing and bindings and if its a variable_name dereference it
	 **/
	dereference(x, binding) {
		if(x.type === "variable_name" && binding[x.value]) {
			console.verbose("[Dereference]", x, binding);
			const currentBinding = binding[x.value];
			// if its a variable, dereference that. unless its this.
			if(currentBinding.type === "variable_name") {
				if(currentBinding.value === x.value) {
					return x;
				} else {
					return this.dereference(currentBinding, binding);
				}
			} else {
				return currentBinding;
			}
		}

		// make sure numeric literals are numeric
		// this helps with comparisons later i.e.
		// 1 !== "1" but "a" === a
		if(x.head === "literal" && x.body[0].type === "numeric-literal") {
			x.body[0].value = parseFloat(x.body[0].value);
		}

		// unwrap literals
		if(x.type === "string-literal" || x.type === "id" || x.type === "numeric-literal") {
			return {head: "literal", body:[x]};
		}

		return x;
	}

	unifyArray(bases, queries, binding={}){
		let currentBinding = binding;
		for(let i in bases) {
			currentBinding = this.unify(bases[i], queries[i], currentBinding);
		}
		return currentBinding;
	}

	/**
	 * attempt to unify 2 terms,
	 * if there is a unification return the bindings.
	 * otherwise, return false
	 **/
	unify(base,query,b={}) {
		let bindings = Object.assign({}, b);
		console.verbose("[UNIFY]", base, query, bindings);

		// Dereference the terms in case they are bound variables
		base = this.dereference(base, bindings);
		query = this.dereference(query, bindings);

		console.verbose("[UNIFY-DEREF]", base, query, bindings);

		// If term1 and term2 are constants, then term1 and term2 unify if and only if they are the same atom, or the same number.
		if(base.head && base.head === "literal" && query.head && query.head === "literal") {
			if(base.body[0].value === query.body[0].value) {
				return bindings;
			} else {
				return false;
			}
		}

		// TODO: make sure this works if base and query are both variables.
		if(base.type && base.type === "variable_name" && query.type && query.type === "variable_name") {
			if(base.value === query.value) {
				return bindings;
			} else if(base.value < query.value) {
				if(bindings[base.value]) return false;
				console.verbose("[BIND]", base.value, query);
				bindings[base.value] = query;
				return bindings;
			} else {
				if(bindings[query.value]) return false;
				console.verbose("[BIND]", query.value, base);
				bindings[query.value] = base;
				return bindings;
			}
		}

		// If term1 is a variable and term2 is any type of term,
		// then term1 and term2 unify, and term1 is instantiated to term2 .
		if(base.type && base.type === "variable_name") {
			if(bindings[base.value]) return false;
			console.verbose("[BIND]", base.value, query);
			bindings[base.value] = query;
			return bindings;
		}

		// Similarly, if term2 is a variable and term1 is any type of term,
		// then term1 and term2 unify, and term2 is instantiated to term1 .
		if(query.type && query.type === "variable_name") {
			if(bindings[query.value]) return false;
			console.verbose("[BIND]", query.value, base);
			bindings[query.value] = base;
			return bindings;
		}

		// If term1 and term2 are complex terms, then they unify if and only if:
		// 	- They have the same functor and arity, and
		//  - all their corresponding arguments unify, and
		//  - the variable instantiations are compatible.
		//  	(For example, it is not possible to instantiate
		// 		variable X to mia when unifying one pair of arguments,
		// 		and to instantiate X to vincent when unifying another pair of arguments .)
		for(let i in query) {
			let qTerm = query[i];
			let bTerm = base[i];
			b = this.unify(bTerm, qTerm, bindings);
			if(b === false) return false;
			bindings = Object.assign(bindings, b);
		}

		return bindings;
	}
}
