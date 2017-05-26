
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
		return new ASTFact(
			this.consumePrimitive(parse[0]),
			parse.length === 2 ? this.consumeArgumentList(parse[1]) : []
		);
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
		} else if(parse.head === "literal") {
			return this.consumePrimitive(parse.body[0]);
		} else if(parse.head === "fact") {
			return this.consumeFact(parse.body);
		}

		throw "Unknown argument: " + JSON.stringify(parse);
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
