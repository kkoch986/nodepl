const createDebug = require('debug');
const Debug = createDebug("interpreter");
import {
    ASTVariable,
	ASTCut,
    ASTFact,
    ASTNumber,
    ASTString,
    ASTRule,
    ASTConcatenation,
    ASTMathAssignment,
    ASTMathExpr,
    ASTMathFactor,
    ASTMathMult
} from "./ast";

/**
 * Take the tokens compiled by the parser and convert them into an AST.
 **/
export default class Interpreter {
    constructor( parse ) {
        this.ast = [];
        for(let i in parse) {
            this.ast.push(this.symbolToAST(parse[i]));
        }
    }

    /**
     * Take the given symbol and return the AST.
     **/
    symbolToAST(symbol) {
		if(symbol.head) {
			if(symbol.head === "fact") {
				return this.consumeFact(symbol.body);
			} else if(symbol.head === "infix") {
				// syntactic sugar for infix operators
				symbol.body[1].type = 'string-literal';
				return this.consumeFact([symbol.body[1], {head: "argument_list", body: [symbol.body[0], symbol.body[2]]}]);
			} else if(symbol.head === "rule") {
				return this.consumeRule(symbol.body);
			} else if(symbol.head === "concatenation") {
				return this.consumeConcat(symbol.body);
			}
		}

		throw "Unable to process symbol: " + JSON.stringify(symbol);
    }

	/**
	 * Convert the given parse tree into a FACT.
	 **/
	consumeFact(parse) {
		// in the case of nested infix operators
		// we may end up here with an array with just one element
		// (the actual infix fact), just break that out and continue;
		if(parse.length === 1) {
			parse = parse[0];
		}

		// since we moved infix inside fact for source parsing,
		// we need to check if this fact is an infix. if it is, extract the
		// body of this fact as the fact.
		if(parse.body && parse.body[0] && parse.body[0].head === "infix") {
			parse = parse.body[0];
			return this.consumeFact(parse);
		}

		// if for some reason we were passed the entire fact ({head: "fact", body: ....})
		// just break it out here and pass it down
		if(parse.head && parse.head === "fact") {
			parse = parse.body;
		}

		if(parse[0] && parse[0].type && parse[0].type.replace(/^Q\./, "") === "cut") {
			return new ASTFact(new ASTString("!"), []);
		}

		// handle infix directly
		if(parse.head === "infix") {
			// syntactic sugar for infix operators
			parse.body[1].type = 'string-literal';
			parse = [parse.body[1], {head: "argument_list", body: [parse.body[0], parse.body[2]]}];
		}

		// if the parse operation is `is`, treat the left half as a variable
		// and the right half as a math expression
		if(parse[1] && parse[1].value === "is") {
			return this.consumeMathAssignment(parse);
		}

		// the head of a fact is a primitive
		const ret = new ASTFact(
			this.consumePrimitive(parse[0]),
			parse.length === 2 ? this.consumeArgumentList(parse[1]) : []
		);

		Debug("[consumeFact] %j", ret);
		return ret;
	}

	/**
	 * Consume a math expression.
	 * Math expressions are given in the following format.
	 * <variable> is <math expression>
	 * we need to process this separately to ensure valid order of
	 * operations in evaluation and to handle infix_groups (parenthesis in a math expression)
	 **/
	consumeMathAssignment(parse) {
		if(parse.length !== 3 || parse[1].value !== "is" || parse[2].head !== "ME.math_expr") {
			throw "Invalid Math Assignment: " + JSON.stringify(parse);
		}

		return new ASTMathAssignment(
			this.consumePrimitive(parse[0]),
            this.consumeMathExpression(parse[2])
		);
	}

    /**
     * Consume a math expression.
     * math expressions break down according to the math_expr grammar.
     **/
    consumeMathExpression(parse) {

        // the left hand side should be a MathMult
        if(parse.head !== "ME.math_expr" || (parse.body.length !== 1 && parse.body.length !== 3)) {
            throw "Invalid Math Expression: " + JSON.stringify(parse);
        }

        if(parse.body.length === 1) {
            return new ASTMathExpr(
                this.consumeMathMult(parse.body[0])
            );
        } else {
            let operation = parse.body[1].type;
            if(operation !== "ME.plus" && operation !== "ME.minus") {
                throw "Invalid Math Expression operator: " + JSON.stringify(parse);
            }
            return new ASTMathExpr(
                this.consumeMathMult(parse.body[0]),
                operation === "ME.plus" ? "+" : "-",
                this.consumeMathMult(parse.body[2])
            );
        }
    }

    /**
     * Consume a math MULT mult is almost the same as expr except
     * it is factor [ (*|/) factor]
     **/
    consumeMathMult(parse){
        // the left hand side should be a Factor
        if(parse.head !== "ME.mult" || (parse.body.length !== 1 && parse.body.length !== 3)) {
            throw "Invalid Math Mult: " + JSON.stringify(parse);
        }

        if(parse.body.length === 1) {
            return new ASTMathMult(
                this.consumeMathFactor(parse.body[0])
            );
        } else {
            let operation = parse.body[1].type;
            if(operation !== "ME.times" && operation !== "ME.divide") {
                throw "Invalid Math Mult operator: " + JSON.stringify(parse);
            }
            return new ASTMathMult(
                this.consumeMathFactor(parse.body[0]),
                operation === "ME.times" ? "*" : "/",
                this.consumeMathFactor(parse.body[2])
            );
        }
    }

    /**
     * A factor should either be a number or variable.
     * it can also be a math expr in parenthesis
     **/
    consumeMathFactor(parse) {
        if(parse.head !== "ME.factor" || parse.body.length !== 1) {
            throw "Invalid Math Factor: " + JSON.stringify(parse);
        }

        if(parse.body[0].head === "ME.math_expr")  {
            return new ASTMathFactor(this.consumeMathExpression(parse.body[0]));
        } else {
            return new ASTMathFactor(this.consumePrimitive(parse.body[0]));
        }
    }

	/**
	 * Convert the given parse into a rule.
	 **/
	consumeRule(parse) {
		return new ASTRule(
			this.consumeFact(parse[0].body),
			this.consumeFactList(parse[1].body)
		);
	}

	/**
	 * Consume a primitive from the given parse.
	 **/
	consumePrimitive(parse) {
		parse.type = parse.type.replace(/^Q\./, "");
		if(parse.type === "id") {
			return new ASTString(parse.value);
		} else if(parse.type === "numeric-literal") {
			return new ASTNumber(parse.value);
		} else if(parse.type === "variable_name") {
			return new ASTVariable(parse.value);
		} else if(parse.type === "string-literal") {
			return new ASTString(parse.value);
		}

		throw "Unknown primitive type: " + JSON.stringify(parse);
	}

	/**
	 * Consume a list of arguments and return them in an array.
	 **/
	consumeArgumentList(parse) {
		if(parse.head === "argument_list") {
			let args = parse.body;
			let ret = [];
			for(let a in args) {
				ret.push(this.consumeArgument(args[a]));
			}
			return ret;
		}

		throw "Unknown argument_list: " + JSON.stringify(parse);
	}

	/**
	 * An argument is either a fact or a primitive.
	 **/
	consumeArgument(parse) {
		if(parse.type && parse.type.replace(/^Q\./, "") === "variable_name") {
			return this.consumePrimitive(parse);
		} else if(parse.head.replace(/^Q\./,"") === "literal") {
			return this.consumePrimitive(parse.body[0]);
		} else if(parse.head.replace(/^Q\./,"") === "fact") {
			return this.consumeFact(parse.body);
		} else if(parse.head.replace(/^Q\./,"") === "list") {
			if(parse.body.length === 0) {
				return new ASTFact(new ASTString("|"), []);
			}
			return this.consumeList(parse.body[0]);
		}

		throw "Unknown argument: " + JSON.stringify(parse);
	}

	/**
	 * Consume a LIST.
	 * Lists are simply a syntactic sugar for the '.'/2 and '.'/0 predicate.
	 * A list like [1,2,3] is stored as `.(1,.(2, .(3, .())))`
	 * an arugment_list parse is what should be passed into this.
	 **/
	consumeList(list) {
		// if we got a CONs thats just syntactic sugar
		// we would convert A | L into |(A,L).
		// "|"(A,L). should be defined in the standard predicates
		// cons is supported in 2 major uses:
		//    [X|L] - where each side is jsut a single entity.
		//    [a,b,c|L] - where there are multiple elements on one or both sides
		// in the case where there is just a single element.
		// For 2 single elements, we will create an operation like |(X,L) which
		// makes it effectively a Hd/Tl operation.
		// when either side is a list we should start by creating the list out of
		// that. So [1,2,3|X] should result in |(1,|(2,|(3,X))) so it would unify
		// with [1,2,3,4,5] as X = [4,5].
		// similarly the tail part can be an array so [X|4,5,6] should result in
		// |(X,|(4, |(5, |(6, |())))). They can be combined like [1,2,3|4,5,6]
		// which isnt very meaningful as it would just result in the list
		// [1,2,3,4,5,6]
		// TODO: solid unit test coverage of this.
		if(list.head && list.head === "Q.cons") {
			let partA = list.body[0].body;
			let partB = list.body[2].body;
			// build the second half first then we can just glue it on
			// to the end of the partA chain.
			let partBArray = [];
			let partBOriginal = partB.length === 1 ?
				this.consumeArgument(partB[0])
				: new ASTFact(new ASTString("|"), partBArray);
			if(partB.length > 1) {
				for(let i in partB) {
					partBArray[0] = this.consumeArgument(partB[i]);
					let newArray = [];
					let newFact = new ASTFact(new ASTString("|"), newArray);
					partBArray[1] = newFact;
					partBArray = newArray;
				}
			}

			let currentArray = [];
			let original = new ASTFact(new ASTString("|"), currentArray);

			if(partA.length > 1) {
				// load the first part of the cons into a list
				for(let i in partA) {
					currentArray[0] = this.consumeArgument(partA[i]);
					if(parseInt(i) === partA.length - 1) {
						currentArray[1] = partBOriginal;
					} else {
						let newArray = [];
						let newFact = new ASTFact(new ASTString("|"), newArray);
						currentArray[1] = newFact;
						currentArray = newArray;
					}
				}
			} else {
				currentArray[0] = this.consumeArgument(partA[0]);
				currentArray[1] = partBOriginal;
			}

			return original;
		}

		// if its not cons, it should be an argument list which will be
		// stacked
		if(list.head.replace(/^Q\./, "") !== "argument_list") {
			throw "consumeList expects an argument list as the parameter, got: " + JSON.stringify(list);
		}

		let currentBody = [];
		let outside = new ASTFact(new ASTString("|"), currentBody);
		let currentFact = outside;
		let newBody = null;
		let newFact = null;

		for(let i in list.body) {
			let arg = this.consumeArgument(list.body[i]);
			currentBody.push(arg);
			newBody = [];
			newFact = new ASTFact(new ASTString("|"), newBody);
			currentBody.push(newFact);
			currentBody = newBody;
			currentFact = newFact;
		}

		return outside;
	}

	/**
	 * Consume and array of facts.
	 **/
	consumeFactList(parse) {
		const ret = [];
		for(let i in parse) {
			ret.push(this.consumeFact(parse[i]));
		}
		return ret;
	}

	/**
	 * Consume a concatenation
	 * this is really only applicable to query syntax.
	 **/
	consumeConcat(parse) {
		return new ASTConcatenation(this.consumeFactList(parse));
	}

    /**
     * Return the AST.
     **/
    get() {
        return this.ast;
    }
}
