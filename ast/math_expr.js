
import ASTBase from "./base";

class ASTMathExpr extends ASTBase {
	constructor(leftHand, rightHand) {
		super();

		// assert that lhs is a primitive
		if(!this.leftHand.isPrimitive()) {
			throw "Math Expression Left Hand MUST be a Primitive.";
		}

		// // assert that rhs is a math expression
		// if(!this.rightHand.getClass() !== ) {
		// 	throw "Math Expression Right Hand MUST be a Primitive.";
		// }
	}
}


export {ASTMathExpr, ASTMathFactor, ASTMathMult, ASTMathSum};
