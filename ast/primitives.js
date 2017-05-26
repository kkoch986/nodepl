import ASTBase from "./base";

/**
 * Strings just have one argument, the string...
 **/
class ASTString extends ASTBase {
	constructor(value) {
		super();
		this.value = value;
	}

	isPrimitive() { return true; }

	getValue() {
		return this.value;
	}

	pretty() {
		return "\"" + this.getValue() + "\"";
	}
}

/**
 * Numbers, can take a string as an arg but it will be parseFloated and throw
 * if the value is not numeric.
 **/
class ASTNumber extends ASTString  {
	constructor(value) {
		super();
		this.value = parseFloat(value);
		if(isNaN(this.value)) throw "Unexpected number: " + value;
	}

	pretty() {
		return this.getValue();
	}
}

/**
 * Variables, pretty much just a string for now.
 **/
class ASTVariable extends ASTString  {
	constructor(value) {
		super(value);
	}

	setValue(value) {
		this.value = value;
	}

	pretty() {
		return this.getValue();
	}
}


export { ASTString, ASTNumber, ASTVariable };
