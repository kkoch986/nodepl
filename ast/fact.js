
import ASTBase from "./base";

export default class ASTFact extends ASTBase {
	constructor(head, body) {
		super();
		this.head = head;
		this.body = body;

		// assert that head is a primitive
		if(!this.head.isPrimitive()) {
			throw "Fact Head MUST be a Primitive.";
		}

		// asser that the body is an array.
		if(!Array.isArray(this.body)) {
			throw "Fact Body MUST be an Array.";
		}
	}

	/**
	 * Return the signature for this fact. it is the head followed by the arity.
	 * ex. a/2
	 **/
	getSignature() {
		return this.getHead().value + "/" + this.getBody().length;
	}

	getHead() {
		return this.head;
	}

	getBody() {
		return this.body;
	}

	pretty() {
		return this.getHead().getValue() + "(" + this.getBody().map(a => a.pretty()).join(",") + ").";
	}
}
