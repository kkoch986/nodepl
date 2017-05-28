const createDebug = require('debug');
const Debug = createDebug("interpreter");
import {ASTVariable, ASTFact, ASTNumber, ASTString, ASTRule, ASTConcatenation} from "./ast";

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
		// if for some reason we were passed the entire fact ({head: "fact", body: ....})
		// just break it out here and pass it down
		if(parse.head && parse.head === "fact") {
			parse = parse.body;
		}

		if(parse.head === "infix") {
			// syntactic sugar for infix operators
			parse.body[1].type = 'string-literal';
			parse = [parse.body[1], {head: "argument_list", body: [parse.body[0], parse.body[2]]}];
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
		if(list.head && list.head === "cons") {
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
