import process from "process";

const createDebug = require('debug');
const Debug = createDebug("resolver");

// TODO: use this to profile resolution
const Profile = createDebug("profile:resolver");

/**
 * The class where most of the magic happens.
 **/
export default class Default {
	constructor(indexer) {
		this.indexer = indexer;
	}

	/**
	 * Resolve a given array of statements.
	 * Bindings should be an array of objects.
	 * This function returns a generator which will asynchronously return truthful
	 * bindings as they are discovered.
	 **/
	*resolveStatements(statements, bindings = [{}]) {
		Debug("[ResolveStatements] \n\t%j \n\t%j", statements, bindings);

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

		return ;
	}


	/**
	 * Resolve a single statement.
	 * can accept an array of bindings and will return an array of bindings for
	 * which there is a valid resolution of this statement.
	 **/
	*resolveStatement(statement, bindings=[{}]) {
		Debug("[ResolveStatement] \n\t%j \n\t%j", statement, bindings);

		switch(statement.getClass()) {
			case "Fact":
				for(let r of this.resolveFact(statement, bindings)) {
					yield r;
				}
				break ;
			default:
				throw "[ResolveStatement] Unknown statement type: " + JSON.stringify(statement);
		}
	}

	/**
	 * Resolve a single fact.
	 **/
	*resolveFact(fact, bindings=[{}]) {
		let signature = fact.getSignature();

		/////////////////////////////////////////////////////////////////
		// SPECIAL CASE PREDICATES
		/////////////////////////////////////////////////////////////////
		/////////////////////////////////////////////////////////////////
		/// =/2
		/// Unifies the 2 arguments
		if(signature === "=/2") {
			let left = fact.getBody()[0];
			let right = fact.getBody()[1];
			for(let b in bindings) {
				let res = this.unify(left, right, bindings[b]);
				if(res !== false) {
					yield res;
				}
			}
		}
		/////////////////////////////////////////////////////////////////
		/////////////////////////////////////////////////////////////////
		/// writeln/1
		/// Pretty print the argument
		else if(signature === "writeln/1") {
			for(let b in bindings) {
				process.stdout.write(fact.getBody()[0].pretty(this, bindings[b]) + "\n");
				yield bindings[b];
			}
		}
		/////////////////////////////////////////////////////////////////
		/////////////////////////////////////////////////////////////////
		/// write/2
		/// Pretty print the argument with no newline
		else if(signature === "write/1") {
			for(let b in bindings) {
				process.stdout.write(fact.getBody()[0].pretty(this, bindings[b]));
				yield bindings[b];
			}
		}
		/////////////////////////////////////////////////////////////////
		/////////////////////////////////////////////////////////////////
		/// fail/0
		/// reject all bindings.
		else if(signature === "fail/0") {
			return ;
		}
		/////////////////////////////////////////////////////////////////
		/////////////////////////////////////////////////////////////////

		// get all of the statements from the index that match this signature
		let statements = this.indexer.statementsForSignature(signature);
		let statement = statements.next().value;
		while(statement) {

			// loop over the bindings and try to unify things
			switch(statement.getClass()) {
				// Fact v. Fact is simple, just loop over the bindings and
				// unify the bodies. anything that unifies is returned.
				case "Fact":
					Debug("[ResolveFact] \n\t%j \n\t%j \n\t%j", statement, fact, bindings);
					for(let b in bindings) {
						let res = this.unifyArray(statement.getBody(), fact.getBody(), bindings[b]);
						if(res !== false) {
							yield res;
						}
					}
					break ;

				case "Rule":
					Debug("[ResolveRule] \n\t%j \n\t%j \n\t%j", fact, statement, bindings);
					// For Fact v. Rule, we first unify the head of the rule
					// with the fact. we then take that binding and apply it to
					// each statement in the body of the rule. if any of them fail
					// the entire rule fails since the concatenation is an AND operation.
					for(let b in bindings) {
						let initialBinding = this.unifyArray(statement.getHead().getBody(), fact.getBody(), bindings[b]);
						for(let result of this.resolveStatements(statement.getBody(), [initialBinding])) {
							let vars = fact.extractVariables();
							let newBinding = Object.assign({},bindings[b]);
							for(let v in vars) {
								if(result[vars[v]]) {
									newBinding[vars[v]] = result[vars[v]].ground(this,result);
								}
							}
							yield newBinding;
						}
					}
					break ;
				default:
					throw "[ResolveFact] Unknown statement type: " + JSON.stringify(statement);
			}

			statement = statements.next().value;
		}
	}

	/**
	 * Attempt to complete the given binding.
	 * will return false if there is already a binding for the given key.
	 * otherwise will return a new object with the binding.
	 **/
	bind(key, value, binding = {}) {
		if(binding[key]) return false;
		Debug("[BIND] %s \n\t%j \n\t%j", key, value, binding);
		binding[key] = value;
		return binding;
	}

	/**
	 * Dereference the given AST node.
	 * if the given argument is a variable, keep trying to dereference until
	 * we get a value. otherwise just returns the input.
	 **/
	dereference(base, binding = {}) {
		Debug("[DEREFERENCE] \n\t%j \n\t%j", base, binding);
		if(base.getClass() === "Variable") {
			let currentBoundValue = binding[base.getValue()];
			if(!currentBoundValue) {
				return base;
			} else if(currentBoundValue.getClass() === "Variable") {
				return this.dereference(currentBoundValue, binding);
			} else {
				return currentBoundValue;
			}

		} else {
			return base;
		}
	}

	/**
	 * Unify an array of terms.
	 * This will unify the terms in the array one for one, passing the updated
	 * bindings to each successive call.
	 */
	unifyArray(bases, queries, binding={}){
		Debug("[UNIFYARRAY] \n\t%j \n\t%j \n\t%j", bases, queries, binding);
		let currentBinding = Object.assign({}, binding);
		for(let i in bases) {
			currentBinding = this.unify(bases[i], queries[i], currentBinding);
			if(currentBinding === false) return false;
		}
		return currentBinding;
	}

	/**
	 * Return the binding if the given statements can unify.
	 * returns FALSE otherwise
	 **/
	unify(base, query, binding={}) {

		// Dereference variables.
		base = this.dereference(base, binding);
		query = this.dereference(query, binding);

		let baseType = base.getClass();
		let queryType = query.getClass();

		console.verbose("[UNIFY]", base, query, binding);
		Debug("[UNIFY] \n\t%j \n\t%j \n\t%j", base, query, binding);

		// if both terms are literals, just check that they are exactly the same
		if((baseType === "String" || baseType === "Number") && baseType === queryType) {
			if(base.getValue() === query.getValue()) return binding;
			else {
				Debug("[FAIL] \n\t%j \n\t%j \n\t%j", base, query, binding);
				return false;
			}
		}

		// If both terms are variables, pick one and link it to the other
		// (using alphabetical order or something).
		if(baseType === "Variable" && queryType === "Variable") {
			let baseValue = base.getValue();
			let queryValue = query.getValue();
			// if both terms are the same variable, do no binding, but return
			// the binding since these terms do in fact unify.
			if(baseValue === queryValue) {
				return binding;
			} else if(baseValue < queryValue) {
				return this.bind(baseValue, query, binding);
			} else {
				return this.bind(queryValue, base, binding);
			}
		}

		// if the base is a variable and the the query is any kind of term
		// assign the value of the base to the value of the query.
		// apply the same logic if the query is variable.
		if(baseType === "Variable") {
			return this.bind(base.getValue(), query, binding);
		} else if(queryType === "Variable") {
			return this.bind(query.getValue(), base, binding);
		}

		// TODO: this doesnt seem to work for resolving rule calls like `a("|"(X,Y)).`
		// unify complex terms
		// If term1 and term2 are complex terms, then they unify if and only if:
		// 	- They have the same functor and arity, and
		//  - all their corresponding arguments unify, and
		//  - the variable instantiations are compatible.
		//  	(For example, it is not possible to instantiate
		// 		variable X to mia when unifying one pair of arguments,
		// 		and to instantiate X to vincent when unifying another pair of arguments.)
		if(baseType === "Fact" && queryType === "Fact") {
			// check that the symbols match
			// TODO: could maybe support hilog here by unifying the symbols instead of
			// just comparing them, would need to make sure the parser could support
			// variables in the functor position
			if(base.getHead().getValue() !== query.getHead().getValue()) {
				Debug("[FAIL] \n\t%j \n\t%j \n\t%j", base, query, binding);
				return false;
			}

			if(base.getBody().length !== query.getBody().length) {
				Debug("[FAIL] \n\t%j \n\t%j \n\t%j", base, query, binding);
				return false;
			}

			// now just unify the bodies using unifyArray
			return this.unifyArray(base.getBody(), query.getBody(), binding);
		}

		Debug("[FALLTHROUGH FAIL] \n\t%j \n\t%j \n\t%j", base, query, binding);
		return false;
	}
}
