
import commandLineArgs from 'command-line-args';
import getUsage from 'command-line-usage';

import util from "util"
import fs from "fs";
import readline from "readline";
import Grammars from "./grammar";
import JSParse from "js-parse";
const Parser = JSParse.Parser.LRParser;

import Indexer from "./indexer";

/**
 * A list of the command line arguments formatted for
 * both commandLineArgs and commandLineUsage
 **/
const options = [
	{
		name: "src",
		type: String,
		defaultOption: true,
		typeLabel: '[underline]{file}',
		description: "A source file to run."
	},
	{
		name: "output",
		alias: "o",
		type: String,
		typeLabel: '[underline]{file}',
		description: "A file to output the indexed data."
	},
	{
		name: "query",
		alias: "q",
		type: String,
		typeLabel: '[underline]{file}',
		description: "Enter an interactive shell to query an index file."
	},
	{
		name: "verbose",
		alias: "v",
		type: Boolean,
		description: "Print out a lot of noise"
	},
	{
		name: "help",
		type: Boolean,
		alias: "h",
		typeLabel: "",
		description: "Print this usage guide."
	}
];

// parse the args and figure out what to do
const args = commandLineArgs(options);
console.verbose = (...stuff) => args.verbose ? console.log(...stuff) : false;

/**
 * Show the help message
 **/
if(args.help === true) {
	const sections = [
	  {
	    header: 'NodePL',
	    content: 'A Test Datalog-esque language using js-parse for incremental processing of files.'
	  },
	  {
	    header: 'Options',
	    optionList: options
	  }
	]
	const usage = getUsage(sections)
	console.log(usage)
}
/**
 * Execute a fact file.
 **/
else if(args.src) {
	// Create the parser and indexer
	const parser = Parser.CreateWithLexer(Grammars.src);
	const indexer = new Indexer();
	console.verbose(parser.bnfString());

	parser.getLexer().on("token", (tok) => console.verbose("TOK", tok));
	parser.on("production", (tok) => console.verbose("PROD", tok));
	parser.on("accept", (tok) => console.verbose("\n\nACCEPT", parser.prettyPrint("  ")));
	parser.on("error", (error) => {throw error.message});

	parser.on("statement", (statement) => {
		indexer.indexStatement(statement[0]);
	})

	const rd = readline.createInterface({
		input: fs.createReadStream(args.src),
		terminal:false
	});

	rd.on("line", (line) => {
		parser.append(line + "\n");
	});

	rd.on("close", () => {
		parser.end();
		indexer.serialize(args.output || "index.json");
	})
}
/**
 * Query mode
 **/
else if(args.query) {
	// Create the parser and indexer
	const parser = Parser.CreateWithLexer(Grammars.query);
	console.verbose(parser.bnfString());

	// Load the indexer
	const indexer = new Indexer();
	console.verbose("[LOAD INDEXER]", args.query);
	indexer.deserializeFromFile(args.query).then(() => {
		parser.getLexer().on("token", (tok) => console.verbose("TOK", tok));
		parser.on("production", (tok) => console.verbose("PROD", tok));
		// parser.on("accept", (tok) => console.verbose("\n\nACCEPT", parser.prettyPrint("  ")));
		parser.on("error", (error) => {throw error.message});

		parser.on("accept", (statement) => {
			console.log("\nResults: ");
			for(let result of indexer.resolveStatement(statement[0])) {
				for(let key in result) {
					console.log("\t" + key + " -> " + result[key].value);
				}
				console.log("");
			}
		})

		const rd = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		function next() {
			// TODO: allow partial statements here
			rd.question('> ', (answer) => {
				parser.append(answer);
				parser.end();
				next();
			});
		}
		next();
	}).catch((e) => {
		console.err(e);
	});

}
