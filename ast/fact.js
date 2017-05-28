
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

	pretty(engine=null,binding={}) {
		let head = this.getHead();
		let body = this.getBody();

		// LISTS
		// if this is a ./2 or ./0 print it as a list
		if(head.getValue() === "|" && (body.length === 0 || body.length === 2)) {
			if(body.length === 0) {
				return "[]";
			}

			let output = [];
			let currentFact = this;
			while(currentFact) {
				if(currentFact.body.length === 0) break ;
				output.push(currentFact.body[0].pretty(engine,binding));
				currentFact = currentFact.body[1];
			}

			return "[" + output.join(",") + "]";
		}

		// normal facts
		return head.getValue() + "(" + body.map(a => a.pretty(engine,binding)).join(",") + ")";
	}
}
