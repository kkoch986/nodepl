

export default class ASTBase {
	constructor() {
		this.class = this.getClass();
	}

	getClass() {
		return this.constructor.name.replace(/^AST/, "");
	}

	isPrimitive() { return false; }

	pretty() {
		return JSON.stringify(this);
	}
}
