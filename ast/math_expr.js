
import ASTBase from "./base";

class ASTMathAssignment extends ASTBase {
	constructor(leftHand, rightHand) {
		super();

		this.leftHand = leftHand;
		this.rightHand = rightHand;

		// assert that lhs is a primitive
		if(!this.leftHand.isPrimitive()) {
			throw "Math Assignment Left Hand MUST be a Primitive.";
		}

		// assert that rhs is a math expression
		if(this.rightHand.getClass() !== "MathExpr") {
			throw "Math Assignment Right Hand MUST be a MathExpr.";
		}
	}

	getLeftHand() { return this.leftHand; }
	getRightHand() { return this.rightHand; }
}

class ASTMathExpr extends ASTBase {
	constructor(leftHand, operation = null, rightHand = null) {
		super();

		this.leftHand = leftHand;
		this.operation = operation;
		this.rightHand = rightHand;

		// assert the left hand is a mult
		if(this.leftHand.getClass() !== "MathMult") {
			throw "Math Expression Left hand must be a MathMult.";
		}

		if(operation !== null) {
			// assert the operation is either + or -
			if(this.operation !== "+" && this.operation !== "-") {
				throw "Math Expression operation must be either + or -";
			}

			// if theres an operation, there must be a Mult on the RHS
			if(!this.rightHand || this.rightHand.getClass() !== "MathMult") {
				throw "Math Expression with an operation must have a MathMult on the Right hand side.";
			}
		}
	}

	getOperation() { return this.operation; }
	getLeftHand() { return this.leftHand; }
	getRightHand() { return this.rightHand; }
}

class ASTMathMult extends ASTBase {
	constructor(leftHand, operation, rightHand) {
		super();

		this.leftHand = leftHand;
		this.operation = operation;
		this.rightHand = rightHand;

		// assert the left hand is a mult
		if(this.leftHand.getClass() !== "MathFactor") {
			throw "Math Mult Left hand must be a Factor.";
		}

		if(this.operation && this.operation !== null) {
			// assert the operation is either + or -
			if(this.operation !== "*" && this.operation !== "/") {
				throw "Math Expression operation must be either * or /";
			}

			// if theres an operation, there must be a Mult on the RHS
			if(!this.rightHand || this.rightHand.getClass() !== "MathFactor") {
				throw "Math Mult with an operation must have a Factor on the Right hand side.";
			}
		}
	}

	getOperation() { return this.operation; }
	getLeftHand() { return this.leftHand; }
	getRightHand() { return this.rightHand; }
}

class ASTMathFactor extends ASTBase {
	constructor(value) {
		super();

		// a factor must either be a variable, a numeric literal or a math expression
		if(value.getClass() !== "Variable" && value.getClass() !== "Number" && value.getClass() !== "MathExpr") {
			throw "Invalid Math Factor: " + JSON.stringify(value);
		}

		this.value = value;
	}

	getValue() { return this.value; }
}


export {ASTMathAssignment, ASTMathExpr, ASTMathFactor, ASTMathMult};
