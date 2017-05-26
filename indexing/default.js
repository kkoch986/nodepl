/**
 * The indexer.
 * in the current scheme of things, the parser just writes all of the facts and
 * rules sequentially in a file. Because of this the indexers job will be to
 * consume the raw sequential parse data and compile it into some kind of indexed
 * file which can quickly be queried for predicates matching the given signatures.
 *
 * This class is meant to be extended and the serialization/deserialization is
 * left up to individual implementations to leave as much flexibility for indexers
 * to be optimized for various use cases.
 *
 * The default indexer will build the entire index in memory so may not be ideal
 * for large source files.
 **/
import Promise from "promise";
import fs from "fs";
import readline from "readline";
import {Deserialize} from "../ast";

// TODO: unit tests for default indexer.

export default class DefaultIndexer {
	static nextVariableIndex = 0;
	/**
	 * return the next available anonymous variable name.
	 * will increment the counter, so calling this function should never
	 * yield the same result twice.
	 **/
	static getNextVariableName() {
		return "_h" + (DefaultIndexer.nextVariableIndex++);
	}

	/**
	 * Replace all of the variable names in the given structure with anonymized
	 * names that begin with _h followed by incrementing integers.
	 * This is to avoid problems where, for instance, the rule:
	 *   fof(A,B) :- friend(A,C), friend(C,B).
	 * interferes with the query:
	 *   ?- fof(A,B).
	 * obviously the A,B in the query have nothing to do with the A,B in the rule
	 * definition. So to combat this we would index the rule as:
	 *   fof(_h1, _h2) :- friend(_h1, _h3), friend(_h3, _h2).
	 **/
	anonymizeVariables(ast, mapped = {}) {
		switch(ast.getClass()) {
			case "Variable":
				if(mapped[ast.getValue()]) {
					ast.setValue(mapped[ast.getValue()]);
				} else {
					let nextVal = DefaultIndexer.getNextVariableName();
					mapped[ast.getValue()] = nextVal;
					ast.setValue(nextVal);
				}
				break ;
			case "Fact": {
				let body = ast.getBody();
				for(let i in body) {
					mapped = this.anonymizeVariables(body[i], mapped);
				}
			}
			break ;
			case "Rule": {
				mapped = this.anonymizeVariables(ast.getHead());
				let body = ast.getBody();
				for(let i in body) {
					mapped = this.anonymizeVariables(body[i], mapped);
				}

			}
			break ;
		}

		return mapped;
	}

	/**
	 * Read in the given source file and output an index (potentially using the file given.)
	 * returns a promise which need not return anything.
	 **/
	indexFile(sourceFileName, outputFileName) {
		return new Promise((accept, reject) => {
			const index = {};

			const rd = readline.createInterface({
				input: fs.createReadStream(sourceFileName)
			});

			rd.on("line", (line) => {
				const ast = Deserialize(JSON.parse(line));
				if(ast.getClass() === "Fact" || ast.getClass() === "Rule") {
					let signature = ast.getSignature();
					if(!index[signature]) index[signature] = [];
					this.anonymizeVariables(ast);
					index[signature].push(ast);
				} else {
					// what do we do here?
					// TODO: if its a query (starts with ?-), we could execute it as such?
					throw "[INDEXER] Unable to index: " + line;
				}
			});

			rd.on("close", () => {
				fs.writeFile(outputFileName, JSON.stringify(index), (err) => {
					if(err) reject(err);
					else accept();
				});
			});
		});
	}

	/**
	 * initializeFromFile
	 * perform any necessary initialization using the given file path.
	 * Returns a promise which need not return anything.
	 *
	 * In the default indexer, just parse and deserialize everything into an
	 * in-memory index. This is probably not ideal for larger data sets.
	 **/
	initializeFromFile(filename) {
		this.index = {};
		return new Promise((accept, reject) => {
			fs.readFile(filename, (err, contents) => {
				if(err) reject(err);
				else {
					let data = JSON.parse(contents);
					for(let signature in data) {
						this.index[signature] = [];
						for(let obj in data[signature]) {
							this.index[signature].push(Deserialize(data[signature][obj]));
						}
					}
					accept();
				}
			});
		});
	}

	/**
	 * Statements for signature.
	 * Return all of the statements stored in this index for the given signature.
	 * should return the statements in the form of a generator.
	 **/
	*statementsForSignature(signature) {
		const lookup = this.index[signature];
		for(let i in lookup) {
			yield lookup[i];
		}
	}
}
