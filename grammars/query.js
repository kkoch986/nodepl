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
		"id": {
			"terminal":true,
			"match":"[a-z][a-zA-Z0-9_]*"
		},
		"string-literal": {
			"terminal":true,
			"match":"\"((?:[^\\\\\"]|\\\\.)*)\"",
			"matchOnly": 1
		},
		"variable_name": {
			"terminal":true,
			"match":"[A-Z_][a-zA-Z0-9_]*"
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
		"literal":{
			"terminal":false,
			"mergeIntoParent":true
		},
		"concatenation":{
			"terminal": false,
			"mergeIntoParent":true
		}
	},
	"productions": {
		"literal": [
			[ "numeric-literal" ],
			[ "string-literal" ],
			[ "id" ]
		],
		"statement": [
			["concatenation", "dot"]
		],
		"concatenation":[
			["concatenation", "comma", "fact"],
			["fact"]
		],
		"fact": [
			["id", "open_paren", "argument_list", "close_paren"],
			["id", "open_paren", "close_paren"],
			["string-literal", "open_paren", "argument_list", "close_paren"],
			["string-literal", "open_paren", "close_paren"]
		],
		"argument_list": [
			["argument_list", "comma", "argument"],
			["argument"]
		],
		"argument": [
			["literal"],
			["variable_name"],
			["fact"]
		],
	},
	"startSymbols": [ "statement" ]
};
