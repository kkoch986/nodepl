import Grammars from "../grammar";
import JSParse from "js-parse";
import Interpreter from "../interpreter";
const Parser = JSParse.Parser.LRParser;

import {ASTString, ASTNumber, ASTFact, ASTVariable, ASTRule} from "../ast";

// TODO: parsing lists

describe("AST Classes", () => {
	it("creates primitives", () => {
		let s = new ASTString("S");
		expect(s.getClass()).toBe("String");
		expect(s.getValue()).toBe("S");
		expect(s.isPrimitive()).toBe(true);

		let n = new ASTNumber(10);
		expect(n.getClass()).toBe("Number");
		expect(n.getValue()).toBe(10);
		expect(n.isPrimitive()).toBe(true);
	});

	it("doesnt create non-numeric numbers.", () => {
		expect(() => {
			new ASTNumber("fail")
		}).toThrow();
	});

	it("creates facts", () => {
		let f = new ASTFact( new ASTString("a"), [ new ASTNumber(10), new ASTString("test") ] );
		expect(f.getClass()).toBe("Fact");
		expect(f.isPrimitive()).toBe(false);

		expect(f.getHead().getClass()).toBe("String");
		expect(f.getHead().getValue()).toBe("a");

		expect(f.getBody().length).toBe(2);

		expect(f.getBody()[0].getClass()).toBe("Number");
		expect(f.getBody()[0].getValue()).toBe(10);

		expect(f.getBody()[1].getClass()).toBe("String");
		expect(f.getBody()[1].getValue()).toBe("test");
	});

	it("doesnt create facts with non-primitive heads", () => {
		expect(() => {new ASTFact( new ASTFact( new ASTString("a"), [ ] ))}).toThrow();
	});

	it("doesnt create facts with non-array body", () => {
		expect(() => { new ASTFact( new ASTString("a"), new ASTNumber(10) ) }).toThrow();
	});

	// TODO: write tests for Rule
	// TODO: write tests for Variable
});

describe("AST Generation [source]", () => {
	it("parses a single fact", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		parser.on("error", (error) => {throw error.message});
		parser.on("statement", (statement) => {
			let ast = new Interpreter(statement).get();
			expect(ast.length).toBe(1);

			const fact = ast[0];
			expect(fact.getClass()).toBe("Fact");
			expect(fact.getBody().length).toBe(3);

			const b = fact.getBody()[0];
			expect(b.getClass()).toBe("String");
			expect(b.getValue()).toBe("b");

			const c = fact.getBody()[1];
			expect(c.getClass()).toBe("Number");
			expect(c.getValue()).toBe(10);

			const d = fact.getBody()[2];
			expect(d.getClass()).toBe("Variable");
			expect(d.getValue()).toBe("D");

			done();
		});
		parser.append("a(b,10,D).\n");
		parser.end();
	});

	it("parses an empty fact", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		parser.on("error", (error) => {throw error.message});
		parser.on("statement", (statement) => {
			let ast = new Interpreter(statement).get();
			expect(ast.length).toBe(1);

			const fact = ast[0];
			expect(fact.getClass()).toBe("Fact");
			expect(fact.getBody().length).toBe(0);

			done();
		});
		parser.append("a().\n");
		parser.end();
	});

	it("parses a nested fact.", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		parser.on("error", (error) => {throw error.message});
		parser.on("statement", (statement) => {
			let ast = new Interpreter(statement).get();
			expect(ast.length).toBe(1);

			const fact = ast[0];
			expect(fact.getClass()).toBe("Fact");
			expect(fact.getBody().length).toBe(3);

			const b = fact.getBody()[0];
			expect(b.getClass()).toBe("String");
			expect(b.getValue()).toBe("b");

			const c = fact.getBody()[1];
			expect(c.getClass()).toBe("Fact");
			expect(c.getHead().getValue()).toBe("c");
			expect(c.getBody().length).toBe(1);
			expect(c.getBody()[0].getValue()).toBe("d");

			const d = fact.getBody()[2];
			expect(d.getClass()).toBe("Fact");
			expect(d.getHead().getValue()).toBe("e");
			expect(d.getBody().length).toBe(1);
			expect(d.getBody()[0].getClass()).toBe("Fact");
			expect(d.getBody()[0].getHead().getValue()).toBe("f");
			expect(d.getBody()[0].getBody().length).toBe(1);
			expect(d.getBody()[0].getBody()[0].getValue()).toBe("g");

			done();
		});
		parser.append("a(b,c(d),e(f(g))).\n");
		parser.end();
	});

	it("parses a basic rule.", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		parser.on("error", (error) => {throw error.message});
		parser.on("statement", (statement) => {
			let ast = new Interpreter(statement).get();
			expect(ast.length).toBe(1);
			const rule = ast[0];

			expect(rule.getClass()).toBe("Rule");

			const head = rule.getHead();
			expect(head.getClass()).toBe("Fact");
			expect(head.getHead().getClass()).toBe("String");
			expect(head.getHead().getValue()).toBe("grandparent");

			const body = rule.getBody();
			expect(body.length).toBe(2);
			expect(body[0].getClass()).toBe("Fact");
			expect(body[1].getClass()).toBe("Fact");

			done();
		});
		parser.append("grandparent(A,B) :- parent(A,C), parent(C,B).\n");
		parser.end();
	});

	// TODO: parse rules
});

describe("AST Generation [query]", () => {

	// TODO: rule and fact tests based on the query grammar make sure it works
	// more or less the same as source above.

	it("parses a concatenation", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.query);
		parser.on("error", (error) => {throw error.message});
		parser.on("statement", (statement) => {
			let ast = new Interpreter(statement).get()[0];
			expect(ast.getClass()).toBe("Concatenation");
			let body = ast.getFacts();
			expect(body.length).toBe(2);

			// TODO: check all of the facts...

			done();
		});
		parser.append("a(b,c), b(c(d)).\n");
		parser.end();
	});
});
