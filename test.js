
import Indexer from "./indexer";
const index = require("./index.json");
console.verbose = (...args) => console.log(...args);


const indexer = new Indexer();
indexer.deserialize(index);


// console.log(indexer.unify(
// 	[ { type: 'variable_name', value: 'A' }, { type: 'id', value: 'b' } ],
// 	[ { type: 'variable_name', value: 'A' }, { type: 'id', value: 'b' } ]
// ));

console.log(indexer.unify(
	[ { type: 'id', value: 'a' }, { type: 'id', value: 'b' } ],
	[ { type: 'variable_name', value: 'A' }, { type: 'id', value: 'b' } ],
	{ A: { type: 'variable_name', value: 'A' } }
))