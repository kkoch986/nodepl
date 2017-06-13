

export default class ASTBase {
	constructor() {
		this.class = this.getClass();
	}

	getClass() {
		return this.constructor.name.replace(/^AST/, "");
	}

	isPrimitive() { return false; }

	pretty(engine=null,binding={}) {
		return JSON.stringify(this);
	}

	extractVariables() {
		return [];
	}

	ground(engine, binding={}){
		return this;
	}
}
