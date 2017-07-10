
import ASTBase from "./base";

export default class ASTRule extends ASTBase {
	constructor(head, body) {
		super();
		this.head = head;
		this.body = body;

		// assert that head is a fact
		if(!this.head.getClass() === "Fact") {
			throw "Rule Head MUST be a Fact.";
		}

		// assert that the body is a non-empty array.
		if(!Array.isArray(this.body) || this.body.length === 0) {
			throw "Rule Body MUST be a non-empty Array.";
		}

		// everything in the rule body should be a fact at the top level.
		for(let i in this.body) {
			if(this.body[i].getClass() !== "Fact" && this.body[i].getClass() !== "MathAssignment") {
				throw "Every item in Rule body MUST be a Fact (found "+JSON.stringify(this.body[i])+").";
			}
		}
	}

	/**
	 * Return the signature for this fact. it is the head followed by the arity.
	 * ex. a/2
	 **/
	getSignature() {
		return this.getHead().getSignature();
	}

	getHead() {
		return this.head;
	}

	getBody() {
		return this.body;
	}

	extractVariables() {
		throw "Rule doesnt support extract variables.";
	}

	pretty(engine=null,binding={}) {
		return this.getHead().pretty() + " :- " + this.getBody().map(i => i.pretty()).join(", ");
	}
}
