

util = require('util')
Parser = require("js-parse").Parser.LRParser
ParserDescription = require("./grammar").Grammar
Runtime = require("./runtime").Runtime

# Create the parser
parser = Parser.CreateWithLexer(ParserDescription)

console.log(parser.bnfString())

parser.getLexer().on "token", (tok) ->
	# console.log("tok", tok)

parser.on "production", (head, body) ->
	# console.log("prod:", head, body)

parser.on "accept", (token_stack) ->
	# console.log("\n\nParser Accept:" + parser.prettyPrint("  "))

parser.on "error", (error) ->
	console.log("Parse Error: ", error.message);
	throw error.message;


runtime = new Runtime()
parser.on "statement", (exp) ->
	res = runtime.evaluateExpression(exp[0]);
	if(res)
		console.log("[RES]", res);

# Read in the test doc
fs = require('fs')
readline = require('readline')

rd = readline.createInterface({
	input: fs.createReadStream(__dirname + '/../input/test.jspc'),
	output: process.stdout,
	terminal: false
})

rd.on 'line', (line) ->
	console.log("read", line)
	parser.append(line + "\n")

rd.on 'close', () ->
	console.log("done reading")
	parser.end()
