
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
 * Unfold a list.
 * A list is made of of the term "."(X,Y).
 * where X is the next element in the array and Y is the rest of the array
 */
function unfoldList(indexer, body) {
	// if theres no body, return
	if(!body || body.length === 0) {
		return [];
	} else if(body.length === 1) {
		// if theres only one element it belongs in the list
		// this means its not another nested list term
		return [ toString(indexer, body[0]) ];
	} else if(body.length === 2) {
		// the first term is always just a term, so pass it through toString
		let ret = [ toString(indexer, body[0]) ];

		// if the second term in the body is ".", keep unfolding the list
		// otherwise treat it as a term and add the string to the body.
		if(body[1].type === "fact" && body[1].symbol === ".") {
			ret = ret.concat(unfoldList(indexer, body[1].body));
		} else {
			ret.push(toString(indexer, body[1]));
		}

		return ret;
	}

	// if the body has more than 2 terms we dont know how to handle it
	throw "Invalid list body size ("+body.length+")";
}

/**
 * Convert a dereferenced object to a string.
 */
function toString(indexer, dVal) {
	if(!dVal) return "";
	let outputVal = "";

	// literals
	if(dVal.type === "literal" || (dVal.head && dVal.head === "literal")) {
		outputVal = dVal.body[0].value;
	}
	// Make sure to format Lists correctly
	else if(dVal.type === "fact" && dVal.symbol === ".") {
		outputVal = "["+unfoldList(indexer, dVal.body).join(",")+"]";
	}
	// terms
	else if(dVal.type === "fact") {
		let args = [];
		for(let i in dVal.body) {
			args.push(toString(indexer, dVal.body[i]));
		}
		outputVal = dVal.symbol + "("+args+")";
	}
	// who knows what...
	else {
		outputVal = dVal.value;
	}

	return outputVal;
}

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
	const indexer = new Indexer();

	// a function for printing the results
	function printNext(results) {
		let val = results.next().value;
		if(!val) return false;


		let printed = false;
		for(let key in val) {

			// Dont print any variables that start with "_"
			if(key[0] === "_") continue ;

			// a hack to make sure literals print correctly.
			let outputVal = "unknown";
			let dVal = indexer.dereference(val[key], val);
			console.log("\t" + key + " -> " + toString(indexer, dVal));
			printed = true;
		}
		if(!printed) {
			console.log("Yes.");
		}
		console.log();
		return true;
	}

	// recursively loop over the results,
	// print one and if the user enters a ; then print the next
	// if we run out or the user enters anything else, break out of this
	// and fire the callback.
	// this works with results as the result of a generator, so it is
	// totally lazy when it comes to evaluation. This means we dont have
	// to traverse the entire results tree to get the first result.
	function printAllResults(results, rd, callback) {
		if(printNext(results)) {
			rd.question('; ', (answer) => {
				if(answer === ";") {
					printAllResults(results, rd, callback);
				} else {
					callback();
				}
			});
		} else {
			callback();
		}
	}

	// Load the indexer
	console.verbose("[LOAD INDEXER]", args.query);
	indexer.deserializeFromFile(args.query).then(() => {

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
			console.log("\nResults: ", statement);
			printAllResults(indexer.resolveStatements([statement[0]]), rd, () => {
				console.log("Done.");
				next();
			});
		});

	}).catch((e) => {
		console.err(e);
	});

}
