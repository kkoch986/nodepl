
import Indexer from "./indexer";
const index = require("./index.json");
console.verbose = (...args) => console.log(...args);


const indexer = new Indexer();
indexer.deserialize(index);


// console.log(indexer.unify(
// 	[ { type: 'variable_name', value: 'A' }, { type: 'id', value: 'b' } ],
// 	[ { type: 'variable_name', value: 'A' }, { type: 'id', value: 'b' } ]
// ));

console.log((new Indexer()).unify(
	[
		{
			"body": [
				{
					"body":[
						{
							"body":[
								{"type":"id","value":"b"}
							],
							"type":"literal"
						}
					],
					"type":"fact",
					"symbol":"a"
				}
			],
			"type":"fact",
			"symbol":"d"
		}
	],
	[
		{
			"type":"fact",
			"symbol":"d",
			"body":[
				{"type":"variable_name","value":"A"}
			]
		}
	],
	{}
));
