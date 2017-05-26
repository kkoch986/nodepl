
import commandLineArgs from 'command-line-args';
import getUsage from 'command-line-usage';

import util from "util"
import fs from "fs";
import readline from "readline";
import Grammars from "./grammar";
import JSParse from "js-parse";
const Parser = JSParse.Parser.LRParser;

import AST from "./interpreter";
import {Deserialize} from "./ast";
import {Default as Indexer} from "./indexing";
import {Default as Engine} from "./engine";

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
	const outputFileName = (args.output || "./output/index.json");
	const tempFileName = outputFileName + ".raw";
	const outputFP = fs.openSync(tempFileName, "w");

	parser.getLexer().on("token", (tok) => console.verbose("TOK", tok));
	parser.on("production", (tok) => console.verbose("PROD", tok));
	parser.on("accept", (tok) => console.verbose("\n\nACCEPT", parser.prettyPrint("  ")));
	parser.on("error", (error) => {throw error.message});

	parser.on("statement", (statement) => {
		const ast = new AST(statement).get();
		for(let i in ast) {
			// TODO: catch errors here.
			fs.write(outputFP, JSON.stringify(ast[i]) + "\n", () => {});
		}
	});

	const rd = readline.createInterface({
		input: fs.createReadStream(args.src),
		terminal:false
	});

	rd.on("line", (line) => {
		parser.append(line + "\n");
	});

	rd.on("close", () => {
		parser.end();
		// TODO: catch errors here
		fs.close(outputFP, () => {});

		// Run the indexer now.
		(new Indexer()).indexFile(tempFileName, outputFileName).then(() => {
			// delete the temp file.
			fs.unlink(tempFileName, () => {
				console.log("Done.");
			});
		});
	});
}
/**
 * Query mode
 **/
else if(args.query) {
	// Create the parser and indexer
	const parser = Parser.CreateWithLexer(Grammars.query);
	const indexer = new Indexer();

	// Load the indexer
	console.verbose("[LOAD INDEXER]", args.query);
	indexer.initializeFromFile(args.query).then(() => {

		const engine = new Engine(indexer);

		parser.getLexer().on("token", (tok) => console.verbose("TOK", tok));
		parser.on("production", (tok) => console.verbose("PROD", tok));
		// parser.on("accept", (tok) => console.verbose("\n\nACCEPT", parser.prettyPrint("  ")));
		parser.on("error", (error) => {throw error.message});

		const rd = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		function next() {
			// TODO: allow partial statements here
			rd.question('> ', (answer) => {
				if(!answer.trim()) {
					next();
				} else {
					parser.append(answer);
					parser.end();
				}
			});
		}
		next();

		parser.on("statement", (statement) => {
			// we can assume that the AST for the query grammar returns a Concatenation
			// NOTE: if that assumption ever changes we'll need to update this.
			let results = engine.resolveStatements(new AST(statement).get()[0].getFacts());
			let val = results.next().value;
			if(!val) {
				console.log("No.\n");
			} else {
				while(val) {
					// Take a binding an print that sucker out.
					// the keys of the binding should correspond to the variable names.
					// we can skip anything that starts with an _ since thats a hidden variable.
					let count = 0;
					for(let v in val) {
						if(v[0] === "_") continue ;
						count++;
						console.log(v + " --> " + engine.dereference(val[v], val).pretty());
					}

					// if there are no bindings, just print out 'Yes.' to indicate
					// that the query is successful and true, but there are no
					// bindings to display.
					if(count === 0) {
						console.log("Yes.");
					}
					console.log();

					// TODO: let them hit a key or something to step through
					//       the results. Since things are async, we can prevent
					//       infinite loops this way, no more processing will occur
					//       until results.next() is called.
					val = results.next().value;
				}
			}
			next();
		});

	}).catch((e) => {
		console.err(e);
	});

}
