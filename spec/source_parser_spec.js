
import Grammars from "../grammar";
import JSParse from "js-parse";
const Parser = JSParse.Parser.LRParser;

// TODO: test for multiple facts on a single line or on multiple lines
// TODO: test rejection of concatenation (for now?)
describe("[Source File] Parse", function() {

	/**
	 * Parse a single fact.
	 **/
	it("accept basic fact: a(b).", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "a(b).";

		parser.on("accept", (tok) => {
			expect(tok.length).toBe(1);
			const body = tok[0];
			expect(body).toEqual({
				"head":"statement_list",
				"body":[
					{
						"head":"statement",
						"body":[
							{
								"head":"fact",
								"body":[
									{"type":"id","value":"a"},
									{
										"head":"argument_list",
										"body":[
											{
												"head":"literal",
												"body":[{"type":"id","value":"b"}]
											}
										]
									}
								]
							}
						]
					}
				]
			});
			done();
		});
		parser.on("error", (error) => {
			fail(error);
		});

		parser.append(testString);
		parser.end();
	});

	/**
	 * Parse a single fact with no args and parens
	 **/
	it("accept basic fact no args and parens: a().", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "a().";

		parser.on("accept", (tok) => {
			expect(tok.length).toBe(1);
			const body = tok[0];
			expect(body).toEqual({
				"head":"statement_list",
				"body":[
					{
						"head":"statement",
						"body":[
							{
								"head":"fact",
								"body":[
									{"type":"id","value":"a"}
								]
							}
						]
					}
				]
			});
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
	it("accept basic fact with numeric literal a(12).", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "a(12).";

		parser.on("accept", (tok) => {
			expect(tok.length).toBe(1);
			const body = tok[0];
			expect(body).toEqual({
				"head":"statement_list",
				"body":[
					{
						"head":"statement",
						"body":[
							{
								"head":"fact",
								"body":[
									{"type":"id","value":"a"},
									{
										"head":"argument_list",
										"body":[
											{
												"head":"literal",
												"body":[{"type":"numeric-literal","value":"12"}]
											}
										]
									}
								]
							}
						]
					}
				]
			});

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
	it("accept basic fact with multiple args. a(b,c,d,e).", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "a(b,c,d,e).";

		parser.on("accept", (tok) => {
			expect(tok.length).toBe(1);
			const body = tok[0];
			expect(body).toEqual({
				"head":"statement_list",
				"body":[
					{
						"head":"statement",
						"body":[
							{
								"head":"fact",
								"body":[
									{"type":"id","value":"a"},
									{
										"head":"argument_list",
										"body":[
											{
												"head":"literal",
												"body":[{"type":"id","value":"b"}]
											},
											{
												"head":"literal",
												"body":[{"type":"id","value":"c"}]
											},
											{
												"head":"literal",
												"body":[{"type":"id","value":"d"}]
											},
											{
												"head":"literal",
												"body":[{"type":"id","value":"e"}]
											}
										]
									}
								]
							}
						]
					}
				]
			});

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
	it("accept basic fact with variables and ids", (done) => {
		const parser = Parser.CreateWithLexer(Grammars.src);
		const testString = "a(b,C,d,e).";

		parser.on("accept", (tok) => {
			expect(tok.length).toBe(1);
			const body = tok[0];
			expect(body).toEqual({
				"head":"statement_list",
				"body":[
					{
						"head":"statement",
						"body":[
							{
								"head":"fact",
								"body":[
									{"type":"id","value":"a"},
									{
										"head":"argument_list",
										"body":[
											{
												"head":"literal",
												"body":[{"type":"id","value":"b"}]
											},
											{"type":"variable_name","value":"C"},
											{
												"head":"literal",
												"body":[{"type":"id","value":"d"}]
											},
											{
												"head":"literal",
												"body":[{"type":"id","value":"e"}]
											}
										]
									}
								]
							}
						]
					}
				]
			});

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
