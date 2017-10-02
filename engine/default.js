import process from "process";
import {ASTNumber,ASTVariable} from "../ast";

const createDebug = require('debug');
const Debug = createDebug("resolver");

const WARN = (...args) => {
	console.warn("\n[Warning] ", ...args);
};

// TODO: use this to profile resolution
const Profile = createDebug("profile:resolver");

function PrettyBindings(bindings = [{}]) {
	let ret = [];
	for(let b in bindings) {
		let binding = bindings[b];
		let res = {};
		for(let a in binding) {
			res[a] = binding[a].pretty();
		}
		ret.push(res);
	}
	return ret;
}

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
		Debug("[ResolveStatements] \n\t%j \n\t%j", statements.map(i => i.pretty()), PrettyBindings(bindings));

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
		Debug("[ResolveStatement] \n\t%j \n\t%j", statement.pretty(), PrettyBindings(bindings));

		switch(statement.getClass()) {
			case "Fact":
				for(let r of this.resolveFact(statement, bindings)) {
					yield r;
				}
				break ;
			case "MathAssignment":
				// TODO: explore some kind of math equation resolution
				//       maybe solve something with math exprs on both sides
				//       not really sure about that but it could be really cool.
				// The RHS should be a math Expr, we will attempt to evaluate that
				// down to a numeric value and then assign that to the variable
				// on the LHS.
				for(let r of this.resolveMathAssignment(statement, bindings)) {
					yield r;
				}
				break ;
			default:
				throw "[ResolveStatement] Unknown statement type: " + JSON.stringify(statement);
		}
	}

	/**
	 * Resolve a math assignment.
	 **/
	*resolveMathAssignment(statement, bindings=[{}]) {
		let rhs = statement.getRightHand();
		let lhs = statement.getLeftHand();
		for(let b in bindings) {
			let result = this.resolveMathExpr(rhs, bindings[b]);
			if(result !== false) {
				// try to unify the RHS and LHS
				let res = this.unify(lhs, new ASTNumber(result), bindings[b]);
				if(res !== false) {
					yield res;
				}
			}
		}
	}

	/**
	 * Compute the result of a math expr for a single binding.
	 * will return false or a numeric value as the result.
	 **/
	resolveMathExpr(expr, binding={}) {
		// resolve the lhs first.
		let lhs = this.resolveMathMult(expr.getLeftHand(), binding);
		// Math expressions must be between ground numeric values only
		if(lhs === false || isNaN(lhs)) {
			WARN("Unbound math expression encountered.");
			return false;
		}
		if(expr.getOperation()) {
			let rhs = this.resolveMathMult(expr.getRightHand(), binding);
			// Math expressions must be between ground numeric values only
			if(rhs === false || isNaN(rhs)) {
				WARN("Unbound math expression encountered.");
				return false;
			}
			if(expr.getOperation() === "-") {
				return lhs - rhs;
			} else if(expr.getOperation() === "+") {
				return lhs + rhs;
			} else {
				throw "Unknown math expression operation: " + JSON.stringify(expr);
			}
		} else {
			return lhs;
		}
	}

	/**
	 * compute the result of a math mult for a single binding.
	 * should return false or a numeric value as the result.
	 **/
	resolveMathMult(mult, binding={}) {
		// resolve the lhs first since that is always set.
		let lhs = this.resolveMathFactor(mult.getLeftHand(), binding);
		if(mult.getOperation()) {
			let rhs = this.resolveMathFactor(mult.getRightHand(), binding);
			if(mult.getOperation() === "*") {
				return lhs * rhs;
			} else if(mult.getOperation() === "/") {
				return lhs / rhs;
			} else {
				throw "Unknown math mult operation: " + JSON.stringify(mult);
			}
		} else {
			return lhs;
		}
	}

	/**
	 * compute the result of a math factor for a single binding.
	 * should return false or a numeric value as the result.
	 **/
	resolveMathFactor(mult,binding={}) {
		let val = mult;
		if(val.getClass() === "MathFactor") {
			val = mult.getValue();
		}
		if(val.getClass() === "Number") {
			return val.getValue();
		} else if(val.getClass() === "Variable") {
			let newVal = this.dereference(val, binding);
			if(newVal && (newVal.getValue() !== val.getValue() || newVal.getClass() !== val.getClass())) {
				return this.resolveMathFactor(newVal,binding);
			}
			return false;
		} else if(val.getClass() === "MathExpr") {
			return this.resolveMathExpr(val,binding);
		}

		// if its not one of the above classes, return false
		return false;
	}

	/**
	 * Resolve a single fact.
	 **/
	*resolveFact(fact, bindings=[{}]) {
		let signature = fact.getSignature();

		Debug("[EnterResolveFact] \n\t%j \n\t%j", fact.pretty(), PrettyBindings(bindings));

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
		/// !/0
		/// Prolog Cut, always succeed but discontinue future searches
		/// once we pass this point.
		else if(signature === "!/0") {
			console.log("CUT!!!");
			for(let b in bindings) {
				yield bindings[b];
			}
		}
		/////////////////////////////////////////////////////////////////
		/////////////////////////////////////////////////////////////////
		/// writeln/0 and writeln/1
		/// Pretty print the argument
		else if(signature === "writeln/0") {
			for(let b in bindings) {
				process.stdout.write("\n");
				yield bindings[b];
			}
		}
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
				process.stdout.write(fact.getBody()[0].pretty(this, bindings[b]) + "");
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
		/// true/0
		/// accept all bindings.
		else if(signature === "true/0") {
			for(let b in bindings) {
				yield bindings[b];
			}
		}
		/////////////////////////////////////////////////////////////////
		/////////////////////////////////////////////////////////////////
		else {
			// get all of the statements from the index that match this signature
			let statements = this.indexer.statementsForSignature(signature);
			let statement = statements.next().value;
			while(statement) {

				// loop over the bindings and try to unify things
				switch(statement.getClass()) {
					// Fact v. Fact is simple, just loop over the bindings and
					// unify the bodies. anything that unifies is returned.
					case "Fact":
						Debug("[ResolveFact] \n\t%j \n\t%j \n\t%j", statement.pretty(), fact.pretty(), PrettyBindings(bindings));
						for(let b in bindings) {
							let res = this.unifyArray(statement.getBody(), fact.getBody(), bindings[b]);
							if(res !== false) {
								yield res;
							}
						}
						break ;

					case "Rule":
						Debug("[ResolveRule] \n\t%j \n\t%j \n\t%j", fact.pretty(), statement.pretty(), PrettyBindings(bindings));
						// For Fact v. Rule, we first unify the head of the rule
						// with the fact. we then take that binding and apply it to
						// each statement in the body of the rule. if any of them fail
						// the entire rule fails since the concatenation is an AND operation.
						for(let b in bindings) {
							// initial binding is the binding after we unify the head of the rule we found with the fact
							// we are resolving against. we should use this binding in reverse to ground everything when
							// we finish with the execution.
							let initialBinding = this.unifyArray(statement.getHead().getBody(), fact.getBody(), bindings[b]);
							if(!initialBinding) continue ;
							for(let result of this.resolveStatements(statement.getBody(), [initialBinding])) {
								// new binding should be what we return, it represents the binding we used to
								// create this resolution but after we apply anything in it that was grounded
								// during the resolution of the fact.
								// result contains the environment after we resolved the rule against this
								// binding (bindings[b]). We should use that with reference to initialBinding
								// to figure out what can be grounded in newBinding
								let newBinding = Object.assign({},bindings[b]);

								let vars = fact.extractVariables();
								for(let v in vars) {
									// TODO: handle when vars[v] is not a variable after dereference
									let _var = this.dereference(new ASTVariable(vars[v]), newBinding);
									if(_var.getClass() === "Fact") {
										// console.log(JSON.stringify(result), "\n\n", JSON.stringify(initialBinding));
										// TODO: maybe ground this here?
										// newBinding = _var.ground(this,result);
									} else if(_var.getClass() !== "Variable") {
										// WARN("Non-variable encountered in grounding", JSON.stringify(_var), vars[v], newBinding);
									} else {
										_var = _var.getValue();
										// console.log("HERE", _var, JSON.stringify(result));
										if(result[_var]) {
											newBinding[_var] = result[_var].ground(this,result);
										}
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
	}


	/**
	 * Attempt to complete the given binding.
	 * will return false if there is already a binding for the given key.
	 * otherwise will return a new object with the binding.
	 **/
	bind(key, value, binding = {}) {
		if(binding[key]) return false;
		Debug("[BIND] %s \n\t%j \n\t%j", key, value.pretty(), PrettyBindings([binding]));
		binding[key] = value;
		return binding;
	}

	/**
	 * Dereference the given AST node.
	 * if the given argument is a variable, keep trying to dereference until
	 * we get a value. otherwise just returns the input.
	 **/
	dereference(base, binding = {}) {
		Debug("[DEREFERENCE] \n\t%j \n\t%j", base.pretty(), PrettyBindings([binding]));
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
		Debug("[UNIFYARRAY] \n\t%j \n\t%j \n\t%j", bases.map(i => i.pretty()), queries.map(i => i.pretty()), PrettyBindings([binding]));
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

		Debug("[UNIFY] \n\t%j \n\t%j \n\t%j", base.pretty(), query.pretty(), PrettyBindings([binding]));

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
				Debug("[FAIL] \n\t%j \n\t%j \n\t%j", base.pretty(), query.pretty(), PrettyBindings([binding]));
				return false;
			}

			if(base.getBody().length !== query.getBody().length) {
				Debug("[FAIL] \n\t%j \n\t%j \n\t%j", base.pretty(), query.pretty(), PrettyBindings([binding]));
				return false;
			}

			// now just unify the bodies using unifyArray
			return this.unifyArray(base.getBody(), query.getBody(), binding);
		}

		Debug("[FALLTHROUGH FAIL] \n\t%j \n\t%j \n\t%j", base.pretty(), query.pretty(), binding);
		return false;
	}
}
