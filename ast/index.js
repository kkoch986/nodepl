
import {ASTCut, ASTNumber, ASTString, ASTVariable} from "./primitives";
import ASTFact from "./fact";
import ASTRule from "./rule";
import ASTConcatenation from "./concatenation";
import {ASTMathAssignment, ASTMathExpr, ASTMathFactor, ASTMathMult} from "./math_expr";

/**
 * Take a javascript object and return it as an AST class or array of AST classes
 **/
function Deserialize(obj) {
	if(!obj) return obj;

	// if its an array, just deserialize each element
	if(Array.isArray(obj)) {
		return obj.map(i => Deserialize(i));
	}

	// otherwise if its an object, switch based on its class
	switch(obj.class) {
		// Primitives
		case "String":
			return new ASTString(obj.value);
		case "Variable":
			return new ASTVariable(obj.value);
		case "Number":
			return new ASTNumber(obj.value);

		// Facts and rules
		case "Fact":
			return new ASTFact(Deserialize(obj.head), Deserialize(obj.body));
		case "Rule":
			return new ASTRule(Deserialize(obj.head), Deserialize(obj.body));

		// Concatenation
		case "Concatenation":
			return new ASTConcatenation(Deserialize(obj.facts));

		// Math expression
		case "MathAssignment":
			return new ASTMathAssignment(Deserialize(obj.leftHand), Deserialize(obj.rightHand));
		case "MathExpr":
			return new ASTMathExpr(Deserialize(obj.leftHand), obj.operation, Deserialize(obj.rightHand));
		case "MathMult":
			return new ASTMathMult(Deserialize(obj.leftHand), obj.operation, Deserialize(obj.rightHand));
		case "MathFactor":
			return new ASTMathFactor(Deserialize(obj.value));

		// in default, freak out.
		default:
			throw "AST unable to deserialize: " + JSON.stringify(obj);
	}
}

/**
 * Export everything.
 **/
export {
	ASTCut,
	ASTVariable,
	ASTNumber,
	ASTString,
	ASTFact,
	ASTRule,
	ASTConcatenation,
	ASTMathAssignment,
	ASTMathExpr,
	ASTMathFactor,
	ASTMathMult,
	Deserialize
}
