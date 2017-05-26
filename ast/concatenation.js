
import ASTBase from "./base";

export default class ASTConcatenation extends ASTBase {
	constructor(facts) {
		super();
		this.facts = facts;

		// assert that the body is a non-empty array.
		if(!Array.isArray(this.facts) || this.facts.length === 0) {
			throw "Concat MUST be a non-empty Array.";
		}

		// everything in the rule body should be a fact at the top level.
		for(let i in this.facts) {
			if(this.facts[i].getClass() !== "Fact") {
				throw "Every item in Concatenation body MUST be a Fact (found "+this.fact[i]+").";
			}
		}
	}

	getFacts() {
		return this.facts;
	}
}
