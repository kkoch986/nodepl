
import Indexer from "./indexer";
const index = require("./index.json");
console.verbose = (...args) => console.log(...args);



import {ASTString, ASTNumber, ASTFact} from "./ast";

let s = new ASTString("S");
let n = new ASTNumber(10);
let f = new ASTFact( new ASTString("a"), [ new ASTNumber(10) ] );
console.log(
	s.getClass(), s.getValue(),
	n.getClass(), n.getValue(),
	f.getClass(), f.getHead(), f.getBody()
);
