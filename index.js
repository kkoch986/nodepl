
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

/**
 * A function for printing results.
 * pass in the generator object and the callback
 * to return to the prompt.
 **/
function printNext(results, engine, rd, next) {
	let val = results.next().value;
	if(!val) {
		console.log("No.\n");
		return next();
	} else {
		// Take a binding an print that sucker out.
		// the keys of the binding should correspond to the variable names.
		// we can skip anything that starts with an _ since thats a hidden variable.
		let count = 0;
		for(let v in val) {
			if(v[0] === "_") continue ;
			count++;
			console.log(v + " --> " + val[v].pretty(engine, val) + ".");
		}

		// if there are no bindings, just print out 'Yes.' to indicate
		// that the query is successful and true, but there are no
		// bindings to display.
		if(count === 0) {
			console.log("Yes.");
			console.log();
			return next();
		}
		console.log();

		// let them hit a key or something to step through
		//  the results. Since things are async, we can prevent some
		//  infinite loops this way since no more processing will occur
		//  until results.next() is called.
		rd.question('; ', answer => {
			if(answer === ".") {
				return next();
			}

			printNext(results, engine, rd, next);
		});
	}
}

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
	let startTime = new Date().getTime();

	// support direct import of RDF triples
	let parts = args.src.split(".");
	let extension = parts[parts.length - 1];
	let importRDF = ["ttl", "nt"].indexOf(extension) >= 0;

	// Create the parser and indexer
	const outputFileName = (args.output || "./output/index.json");
	const tempFileName = outputFileName + ".raw";
	const outputFP = fs.openSync(tempFileName, "w");
	const parser = Parser.CreateWithLexer(Grammars.src);

	const rd = readline.createInterface({
		input: fs.createReadStream(args.src),
		terminal:false
	});

	/////////////////////////////////////////////////////////
	// Special RDF import
	/////////////////////////////////////////////////////////
	let lineCount = 0;
	if(importRDF) {
		let rdfPredicateName = args.rdfAs || "rdf";
		console.log("RDF Data Import");
		let N3 = require('n3');
		var rdfParser = N3.Parser();
		const parser = Parser.CreateWithLexer(Grammars.src);
		parser.on("accept", (tok) => {
			console.verbose("\n\nACCEPT", parser.prettyPrint("  "))
		});
		parser.on("error", (error) => {
			console.log("Unable to process line", error);
		});
		parser.on("statement", (statement) => {
			const ast = new AST(statement).get();
			for(let i in ast) {
				// TODO: catch errors here.
				fs.write(outputFP, JSON.stringify(ast[i]) + "\n", () => {});
				lineCount++;
				if(lineCount % 500 === 0) {
					console.log(lineCount + " lines processed so far.");
				}
			}
		});

		rd.on("line", (line) => {
			let parse = rdfParser.parse(line)[0];
			if(!parse) return ;
			let data = rdfPredicateName + '('+
				JSON.stringify(parse.subject) + "," +
				JSON.stringify(parse.predicate) + "," +
				JSON.stringify(parse.object) + "," +
				JSON.stringify(parse.graph) +
			').';
			parser.append(data);
			parser.end();
		});
	}
	/////////////////////////////////////////////////////////
	// normal prolog import
	/////////////////////////////////////////////////////////
	else {
		parser.getLexer().on("token", (tok) => console.verbose("TOK", tok));
		parser.on("production", (tok) => console.verbose("PROD", tok));
		parser.on("accept", (tok) => console.verbose("\n\nACCEPT", parser.prettyPrint("  ")));
		parser.on("error", (error) => {throw error.message});

		parser.on("statement", (statement) => {
			console.verbose(JSON.stringify(statement));
			const ast = new AST(statement).get();
			for(let i in ast) {
				// TODO: catch errors here.
				fs.write(outputFP, JSON.stringify(ast[i]) + "\n", () => {});
			}
		});
		rd.on("line", (line) => {
			parser.append(line + "\n");
		});
	}

	rd.on("close", () => {
		if(!importRDF) {
			parser.end();
		} else {
			console.log(lineCount + " total lines processed");
		}
		console.log("Parsing finished, " + (((new Date().getTime() - startTime) / 1000.0)) + "s");
		startTime = new Date().getTime();

		// TODO: catch errors here
		fs.close(outputFP, () => {});
		console.log("Raw file generated, " + (((new Date().getTime() - startTime) / 1000.0)) + "s");
		startTime = new Date().getTime();

		// Run the indexer now.
		(new Indexer()).indexFile(tempFileName, outputFileName).then(() => {
			// delete the temp file.
			fs.unlink(tempFileName, () => {
				console.log("Done ("+(((new Date().getTime()) - startTime) / 1000.0)+"s).");
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
			rd.question('?- ', (answer) => {
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
			let results = engine.resolveStatements(new AST(statement).get()[0].getFacts());
			printNext(results, engine, rd, next);
		});

	}).catch((e) => {
		console.err(e);
	});

}
