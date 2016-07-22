import fs from "fs"
import JSParse from "js-parse";
const Parser = JSParse.Parser.LRParser;

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
		this.index[symbol + "/" + arity].push(args);
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
	resolveStatement(statements, bindings={}) {
		for(let i in statements) {
			const statement = statements[i];
			switch(statement.head) {
				case "statement":
					return this.resolveStatement(statement.body, bindings);
					break ;
				case "fact":
					let newBindings = this.resolveFact(statement.body, bindings);
					Object.assign(bindings, newBindings);
					break ;
				default:
					throw "Unknown statement type: " + statement.head;
			}
		}

		return bindings;
	}

	/**
	 * Resolve a fact query
	 **/
	resolveFact(statement, bindings={}) {
		const symbol = statement[0].value;
		const args = statement[1].body;
		const arity = args.length;

		const results = [];
		if(this.index[symbol + "/" + arity]) {
			for(let i in this.index[symbol + "/" + arity]) {
				let res = this.unify(this.index[symbol + "/" + arity][i], args, bindings);
				if(res) {
					results.push(res);
				}
			}
		}
		return results;
	}

	/**
	 * Take the given thing and bindings and if its a variable_name dereference it
	 **/
	dereference(x, bindings) {
		if(x.type === "variable_name" && bindings[x.value]) {
			const binding = bindings[x.value];
			// if its a variable, dereference that. unless its this.
			if(binding.type === "variable_name") {
				if(binding.value === x.value) {
					return x;
				} else {
					return dereference(binding);
				}
			} else {
				return binding;
			}
		}
		return x;
	}

	/**
	 * attempt to unify 2 terms,
	 * if there is a unification return the bindings.
	 * otherwise, return false
	 **/
	unify(base,query,b={}) {
		let bindings = b;
		console.verbose("[UNIFY]", Parser.prettyPrint(base), Parser.prettyPrint(query), bindings);

		// Dereference the terms in case they are bound variables
		base = this.dereference(base, bindings);
		query = this.dereference(query, bindings);

		console.verbose("[UNIFY-DEREF]", base, query, bindings);

		// If term1 and term2 are constants, then term1 and term2 unify if and only if they are the same atom, or the same number.
		if(base.type && base.type === "id" && query.type && query.type === "id") {
			if(base.value === query.value) {
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
			console.log(bindings, b);
			bindings = Object.assign(bindings, b);
		}

		return bindings;
	}
}