
import Grammars from "../grammar";
import JSParse from "js-parse";
const Parser = JSParse.Parser.LRParser;

// TODO: test for multiple facts on a single line or on multiple lines
// TODO: test rejection of concatenation (for now?)
describe("[Source File] Parse", function() {

	/**
	 * Parse a single fact.
	 **/
	it("accept basic fact", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "a(b).";
		
		parser.on("accept", (tok) => {
			expect(tok.length).toBe(1);
			const body = tok[0];
			expect(body.head).toBe("statement_list");
			expect(body.body.length).toBe(1);
			expect(body.body[0].head).toBe("statement");
			expect(body.body[0].body.length).toBe(1);
			expect(body.body[0].body[0].head).toBe("fact");
			expect(body.body[0].body[0].body.length).toBe(2);
			expect(body.body[0].body[0].body[0].type).toBe("id");
			expect(body.body[0].body[0].body[0].value).toBe("a");
			expect(body.body[0].body[0].body[1].head).toBe("argument_list");
			expect(body.body[0].body[0].body[1].body.length).toBe(1);
			expect(body.body[0].body[0].body[1].body[0].type).toBe("id");
			expect(body.body[0].body[0].body[1].body[0].value).toBe("b");

			done();
		});
		parser.on("error", (error) => {
			fail(error);
		});

		parser.append(testString);
		parser.end();
	});

	/**
	 * Parse a single with a numeric argument.
	 **/
	it("accept basic fact", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "a(12).";
		
		parser.on("accept", (tok) => {
			expect(tok.length).toBe(1);
			const body = tok[0];
			expect(body.head).toBe("statement_list");
			expect(body.body.length).toBe(1);
			expect(body.body[0].head).toBe("statement");
			expect(body.body[0].body.length).toBe(1);
			expect(body.body[0].body[0].head).toBe("fact");
			expect(body.body[0].body[0].body.length).toBe(2);
			expect(body.body[0].body[0].body[0].type).toBe("id");
			expect(body.body[0].body[0].body[0].value).toBe("a");
			expect(body.body[0].body[0].body[1].head).toBe("argument_list");
			expect(body.body[0].body[0].body[1].body.length).toBe(1);
			expect(body.body[0].body[0].body[1].body[0].type).toBe("numeric-literal");
			expect(body.body[0].body[0].body[1].body[0].value).toBe("12");

			done();
		});
		parser.on("error", (error) => {
			fail(error);
		});

		parser.append(testString);
		parser.end();
	});

	/**
	 * Parse a single fact with some arity
	 **/
	it("accept basic fact", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "a(b,c,d,e).";
		
		parser.on("accept", (tok) => {
			expect(tok.length).toBe(1);
			const body = tok[0];
			expect(body.head).toBe("statement_list");
			expect(body.body.length).toBe(1);
			expect(body.body[0].head).toBe("statement");
			expect(body.body[0].body.length).toBe(1);
			expect(body.body[0].body[0].head).toBe("fact");
			expect(body.body[0].body[0].body.length).toBe(2);
			expect(body.body[0].body[0].body[0].type).toBe("id");
			expect(body.body[0].body[0].body[0].value).toBe("a");
			expect(body.body[0].body[0].body[1].head).toBe("argument_list");
			expect(body.body[0].body[0].body[1].body.length).toBe(4);
			expect(body.body[0].body[0].body[1].body[0].type).toBe("id");
			expect(body.body[0].body[0].body[1].body[1].type).toBe("id");
			expect(body.body[0].body[0].body[1].body[2].type).toBe("id");
			expect(body.body[0].body[0].body[1].body[3].type).toBe("id");
			expect(body.body[0].body[0].body[1].body[0].value).toBe("b");
			expect(body.body[0].body[0].body[1].body[1].value).toBe("c");
			expect(body.body[0].body[0].body[1].body[2].value).toBe("d");
			expect(body.body[0].body[0].body[1].body[3].value).toBe("e");

			done();
		});
		parser.on("error", (error) => {
			fail(error);
		});

		parser.append(testString);
		parser.end();
	});

	/**
	 * Parse a single fact with some arity and a variable
	 **/
	it("accept basic fact", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "a(b,C,d,e).";
		
		parser.on("accept", (tok) => {
			expect(tok.length).toBe(1);
			const body = tok[0];
			expect(body.head).toBe("statement_list");
			expect(body.body.length).toBe(1);
			expect(body.body[0].head).toBe("statement");
			expect(body.body[0].body.length).toBe(1);
			expect(body.body[0].body[0].head).toBe("fact");
			expect(body.body[0].body[0].body.length).toBe(2);
			expect(body.body[0].body[0].body[0].type).toBe("id");
			expect(body.body[0].body[0].body[0].value).toBe("a");
			expect(body.body[0].body[0].body[1].head).toBe("argument_list");
			expect(body.body[0].body[0].body[1].body.length).toBe(4);
			expect(body.body[0].body[0].body[1].body[0].type).toBe("id");
			expect(body.body[0].body[0].body[1].body[1].type).toBe("variable_name");
			expect(body.body[0].body[0].body[1].body[2].type).toBe("id");
			expect(body.body[0].body[0].body[1].body[3].type).toBe("id");
			expect(body.body[0].body[0].body[1].body[0].value).toBe("b");
			expect(body.body[0].body[0].body[1].body[1].value).toBe("C");
			expect(body.body[0].body[0].body[1].body[2].value).toBe("d");
			expect(body.body[0].body[0].body[1].body[3].value).toBe("e");

			done();
		});
		parser.on("error", (error) => {
			fail(error);
		});

		parser.append(testString);
		parser.end();
	});

	/**
	 * Reject a variable as the predicate name
	 **/
	it("reject variable as predicate name", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "A(b).";
		
		parser.on("accept", (tok) => {
			fail("Should not have accepted this.");
		});
		parser.on("error", (error) => {
			done();
		});

		parser.append(testString);
		parser.end();
	});

	/**
	 * Reject just a variable
	 **/
	it("reject just variable", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "A.";
		
		parser.on("accept", (tok) => {
			fail("Should not have accepted this.");
		});
		parser.on("error", (error) => {
			done();
		});

		parser.append(testString);
		parser.end();
	});

	/**
	 * Reject just an atom
	 **/
	it("reject just id", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "a.";
		
		parser.on("accept", (tok) => {
			fail("Should not have accepted this.");
		});
		parser.on("error", (error) => {
			done();
		});

		parser.append(testString);
		parser.end();
	});

	/**
	 * Reject just a number
	 **/
	it("reject just number", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "1.";
		
		parser.on("accept", (tok) => {
			fail("Should not have accepted this.");
		});
		parser.on("error", (error) => {
			done();
		});

		parser.append(testString);
		parser.end();
	});
});