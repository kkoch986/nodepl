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
		console.verbose("[ResolveStatements]", statements, bindings);

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
		console.verbose("[ResolveStatement]", statement, bindings);

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
		console.verbose("[ResolveFact]", fact, bindings);
		let signature = fact.getSignature();

		// get all of the statements from the index that match this signature
		let statements = this.indexer.statementsForSignature(signature);
		let statement = statements.next().value;
		while(statement) {

			// loop over the bindings and try to unify things
			switch(statement.getClass()) {
				// Fact v. Fact is simple, just loop over the bindings and
				// unify the bodies. anything that unifies is returned.
				case "Fact":
					for(let b in bindings) {
						let res = this.unifyArray(statement.getBody(), fact.getBody(), bindings[b]);
						if(res !== false) {
							yield res;
						}
					}
					break ;

				case "Rule":
					// For Fact v. Rule, we first unify the head of the rule
					// with the fact. we then take that binding and apply it to
					// each statement in the body of the rule. if any of them fail
					// the entire rule fails since the concatenation is an AND operation.
					for(let b in bindings) {
						let initialBinding = this.unifyArray(statement.getHead().getBody(), fact.getBody(), bindings[b]);
						for(let result of this.resolveStatements(statement.getBody(), [initialBinding])) {
							yield result;
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
		console.verbose("[BIND]", key, value, binding);
		binding[key] = value;
		return binding;
	}

	/**
	 * Dereference the given AST node.
	 * if the given argument is a variable, keep trying to dereference until
	 * we get a value. otherwise just returns the input.
	 **/
	dereference(base, binding = {}) {
		console.verbose("[DEREFERENCE]", base, binding);
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
		console.verbose("[UNIFYARRAY]", bases, queries, binding);
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

		// if both terms are literals, just check that they are exactly the same
		if((baseType === "String" || baseType === "Number") && baseType === queryType) {
			if(base.getValue() === query.getValue()) return binding;
			else return false;
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

		// TODO: unify complex terms
	}
}
