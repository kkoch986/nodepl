/**
 * The grammar for parsing valid programs and producing an AST
 **/
export default {
	"symbols":{
		"whitespace": {
			"terminal":true,
			"match":"[ \n\t]+",
			"includeInStream":false
		},
		"numeric-literal":{
			"terminal":true,
			"match":"[0-9]*\\.?[0-9]+",
			"matchCaseInsensitive":true
		},
		"string-literal": {
			"terminal":true,
			"match":"\"((?:[^\\\\\"]|\\\\.)*)\"",
			"matchOnly": 1
		},
		"id": {
			"terminal":true,
			"match":"[a-z][a-zA-Z0-9_]*"
		},
		"variable_name": {
			"terminal":true,
			"match":"[A-Z_][a-zA-Z0-9_]*"
		},
		"implies": {
			"terminal":true,
			"match":":-",
			"excludeFromProduction":true
		},
		"open_paren": {
			"terminal":true,
			"match":"\\(",
			"excludeFromProduction":true
		},
		"close_paren": {
			"terminal":true,
			"match":"\\)",
			"excludeFromProduction":true
		},
		"open_square": {
			"terminal":true,
			"match":"\\[",
			"excludeFromProduction":true
		},
		"close_square": {
			"terminal":true,
			"match":"\\]",
			"excludeFromProduction":true
		},
		"comma": {
			"terminal":true,
			"match":",",
			"excludeFromProduction":true
		},
		"dot": {
			"terminal":true,
			"match":"\\.",
			"excludeFromProduction":true
		},
		"argument": {
			"terminal":false,
			"mergeIntoParent": true
		},
		"argument_list": {
			"terminal": false,
			"mergeRecursive": true
		},
		"statement_list": {
			"terminal": false,
			"mergeRecursive": true
		},
		"fact_list": {
			"terminal": false,
			"mergeRecursive": true
		},
		"literal":{
			"terminal":false
		}
	},
	"productions": {
		"literal": [
			[ "numeric-literal" ],
			[ "string-literal" ],
			[ "id" ]
		],
		"statement_list": [
			["statement_list", "statement"],
			["statement"]
		],
		"statement": [
			["fact", "dot"],
			["rule", "dot"]
		],
		"fact": [
			["id", "open_paren", "argument_list", "close_paren"],
			["id", "open_paren", "close_paren"],
			["string-literal", "open_paren", "argument_list", "close_paren"],
			["string-literal", "open_paren", "close_paren"]
		],
		"rule":[
			["fact", "implies", "fact_list"]
		],
		"fact_list": [
			["fact_list", "comma", "fact"],
			["fact"]
		],
		"list": [
			["open_square" ,"close_square"],
			["open_square", "argument_list", "close_square"]
		],
		"argument_list": [
			["argument_list", "comma", "argument"],
			["argument"]
		],
		"argument": [
			["literal"],
			["variable_name"],
			["fact"],
			["list"]
		]
	},
	"startSymbols": [ "statement_list" ]
};
