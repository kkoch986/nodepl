/*
	Copyright (c) 2014, Kenneth Koch <kkoch986@gmail.com>

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
*/

var Parser = require("js-parse").Parser.LRParser;

var parserDescription = {
	"symbols":{
	    "numeric-literal":{
	      "terminal":true,
	      "match":"[0-9]*\\.?[0-9]+",
	      "matchCaseInsensitive":true
	    },
		"string-literal":{
			"terminal":true,
			"match":"\"(.*)\""
		},
		"id":{
			"terminal":true,
			"match":"[a-zA-Z0-9_]+"
		},

		// Operators and symbols
		"assignment_operator": {
			"terminal":true,
			"match":"((=)|(\\*=)|(/=)|(\\%=)|(\\+=)|(\\-=))"
		},
		"add_operator": {
			"terminal":true,
			"match":"((\\+)|(\\-))",
			"lookAhead":"[^=]"
		},
		"mult_operator": {
			"terminal":true,
			"match":"((\\*)|(/)|(%))",
			"lookAhead":"[^=]"
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
		"semicolon": {
			"terminal":true,
			"match":";",
			"excludeFromProduction":true
		},
		"dot":{
			"terminal":true,
			"match":"\\.",
			"excludeFromProduction":true
		},
		"arrow":{
			"terminal":true,
			"match":"(->)",
			"excludeFromProduction":true	
		},
		"comma":{
			"terminal":true,
			"match":"(,)",
			"excludeFromProduction":true	
		},

		// Keywords
		"kw_is":{
			"terminal":true,
			"match":"(is)",
			"priority":10
		},
		"kw_fn":{
			"terminal":true,
			"match":"(fn)",
			"priority":10,
			"excludeFromProduction":true
		},

		// Types
		"type_num":{
			"terminal":true,
			"match":"(num)",
			"priority":10
		},

		// Things to remove from the parse
		"whitespace": {
			"terminal":true,
			"match":"[ \n\t]+",
			"includeInStream":false
		},
		"comment_//": {
			"terminal":true,
			"match":"//([^\n]*)[\r]?[\n]",
			"includeInStream":false,
			"priority":1000
		},
		"comment_#": {
			"terminal":true,
			"match":"#([^\n]*)[\r]?[\n]",
			"includeInStream":false,
			"priority":1000
		},
		"comment_multiline": {
			"terminal":true,
			"match":"/\\*((?:.|\\n)*)\\*/",
			"includeInStream":false,
			"priority":1000
		},

		// Non-terminals
		"statement_list":{
			"terminal":false,
			"mergeRecursive":true
		},
		"primary_exp":{
			"terminal":false,
			"mergeIntoParent":true
		},
		"arg_def_list":{
			"terminal":false,
			"mergeRecursive":true
		},
		"arg_list":{
			"terminal":false,
			"mergeRecursive":true
		}
	},
	"productions":{
		"literal": [
			[ "numeric-literal" ],
			[ "string-literal" ]
		],
		"statement_list":[
			[ "statement_list", "statement", "dot" ],
			[ "statement", "dot" ]
		],
		"statement":[
			[ "exp" ],
			[ "function_definition" ]
		],
		"exp":[
			["assignment_exp"],
			["add_exp"]
		],
		"primary_exp":[
			[ "open_paren", "exp", "close_paren"],
			[ "id" ],
			[ "literal" ],
			[ "function_call" ]
		],
		"add_exp":[
			[ "mult_exp", "add_operator", "add_exp" ],
			[ "mult_exp" ]
		],
		"mult_exp":[
			[ "primary_exp", "mult_operator", "mult_exp" ],
			[ "primary_exp" ]
		],
		"assignment_exp":[
			[ "primary_exp", "kw_is", "exp" ]
		],

		// Function definitions
		"function_definition":[
			[ "kw_fn", "id", "open_paren", "arg_def_list", "close_paren", "function_body" ],
			[ "kw_fn", "id", "open_paren", "arg_def_list", "close_paren", "function_body" ],
			[ "kw_fn", "id", "open_paren", "close_paren", "function_body" ],
			[ "kw_fn", "id", "open_paren", "close_paren", "function_body" ],
		],
		"function_body":[
			["arrow", "exp"],
			["arrow", "function_definition"]
		],
		"arg_def_list":[
			[ "arg_def_list", "comma", "arg_def" ],
			[ "arg_def" ]
		],
		"type":[
			[ "type_num" ]
		],
		"arg_def":[
			[ "type", "id" ],
			[ "literal" ]
		],

		// Function Calls
		"function_call":[
			[ "id", "open_paren", "arg_list", "close_paren" ]
		],
		"arg_list":[
			[ "primary_exp", "comma", "arg_list" ],
			[ "primary_exp" ]
		]
	},
	"startSymbols": [ "statement_list" ]
};

/**
 * Looks up a symbol in the symbol table.
 * throws if not found.
 **/
var variable_store = {};
function dereference(symbol) {
	if(typeof variable_store[symbol] !== "undefined") {
		return variable_store[symbol];
	} 

	throw "Symbol " + symbol + " not defined.";
}
function store(symbol, value) {
	console.log("store", symbol, value);
	variable_store[symbol] = value;
}

/**
 * Store information about defined functions
 **/
var function_store = {};
function store_function(fn) {
	// Look at the name of the function
	// as well as the type and number of arguments and build a 
	// function signature
	var function_name = fn[0].value;
	var arg_defs = fn[1].body;

	// Loop over the arg defs and build a method signature like
	// <fn_name>(<arg1>:<type1>, ...)
	var arg_sigs = [];
	for(var a in arg_defs) {
		var arg = arg_defs[a];
		switch(arg.body[0].head) {
			case "literal":
				arg_sigs.push({"arg_type":"fixed", "type":typeForLiteral(arg.body[0].body[0].type), "value":arg.body[0].body[0].value});
				break ;
			case "type":
				arg_sigs.push({"arg_type":"var", "type":arg.body[0].body[0].value, "value":arg.body[1].value});
				break ;
			default:
				throw "Unknown arg_def_type: " + arg.body[0].head;
		}
	}

	var body = fn[2].body[0];
	console.log("store fn", function_name, arg_sigs, body);
	if(!function_store[function_name]) {
		function_store[function_name] = [];
	}

	// TODO: ensure that this signature does not already exist.
	// If it does, overwrite it with the new one instead.
	function_store[function_name].push({"arg_sigs":arg_sigs, "body":body});
}

/**
 * Retrieve the best matching function for the given call
 * once it is found, call the function using that functions body and variable bindings.
 **/
// TODO: Need to consider the stack frames when looking up function candidates
// And during body expression evaluation
function call_function(call_exp, stack_frame) {
	if(typeof stack_frame === "undefined") {
		stack_frame = {};
	}

	var function_name = call_exp[0].value;

	// Build the call argument signature
	var call_arg_sigs = [];
	var call_arg_sigs_str = [];

	// TODO: Abstract the construction of arg_sig lists and strings
	for(var a in call_exp[1].body) {
		var arg = evaluateExpression(call_exp[1].body[a], true);
		call_arg_sigs.push(arg);
		call_arg_sigs_str.push(arg.value + ":" + arg.type);
	}
	call_arg_sigs_str = call_arg_sigs_str.join(",");

	console.log("[CALL]", function_name, call_arg_sigs);

	// Try to find the right function signature to use in this case
	var function_candidates = function_store[function_name];
	var current_match = null;
	var current_match_strength = 0;
	var tie = false;
	for(var c in function_candidates) {
		var candidate = function_candidates[c];

		// First ensure they have the same number of args
		if(candidate.arg_sigs.length === call_arg_sigs.length) {
			// Now look at the types
			// We can eliminate calls with fixed argument definitions once we
			// determine the argument does not match.
			// We also prefer fixed argument matches over variable argument matches
			var fails = false;
			var fixed_arg_count = 0;
			for(var ca in candidate.arg_sigs) {
				var candidate_arg = candidate.arg_sigs[ca];
				var call_arg = call_arg_sigs[ca];

				if(candidate_arg.type !== call_arg.type) {
					fails = true;
					break ;
				}

				if(candidate_arg.arg_type === "fixed") {
					fixed_arg_count++;
					if(candidate_arg.value != call_arg.value) {
						fails = true;
						break ;
					}
				}
			}

			if(fails === true) {
				continue ;
			}

			if(current_match === null || fixed_arg_count > current_match_strength) {
				current_match = candidate;
				current_match_strength = fixed_arg_count;
				tie = false;
			} else if(fixed_arg_count === current_match_strength) {
				tie = true;
			}
		}
	}

	if(tie) {
		// TODO: Slightly imprive this message, showing the signatures for the canidates as well.
		throw "Ambiguous function call for " + function_name + "(" + call_arg_sigs_str + ")";
	} else if(current_match === null) {
		throw "No compatible function call found for " + function_name + "(" + call_arg_sigs_str + ")";
	} else {
		// Actually invoke the function body we found
		// TODO: Need to cosntruct and reference the stack frame here...
		console.log("[INVOKE]", current_match);
		return evaluateExpression(current_match.body);
	}
}

/**
 * Retrieve a type for the given literal.
 * Currently, types are only "num" or "string"
 **/
function typeForLiteral(lit) {
	switch(lit) {
		case "numeric-literal":
			return "num";
		default:
			throw "Unknown literal type: " + lit;
	}
}

/**
 * Evaluate any kind of expression.
 * If true, resolveIds will attempt to dereference any id expressions.
 **/
function evaluateExpression(exp, resolveIds) {

	var type = null;
	if(Array.isArray(exp)) {
		if(exp.length === 1) {
			exp = exp[0];
		} else {
			type = "array";
		}
	}
	if(!type) {
		type = exp.head ? exp.head : exp.type;
	}

	console.log("Eval", type);
	// Process the expression based on its type
	switch(type) {
		case "literal":
			switch(exp.body[0].type) {
				case "numeric-literal":
					return {"type":"num", "value":parseFloat(exp.body[0].value)};
				case "string-literal":
					return {"type":"string", "value": exp.body[0].value + ""};
				default:
					throw "Unknown Literal Type: " + exp.body[0].value;
			}
		case "id":
			if(resolveIds === true) {
				return dereference(exp.value);
			} else {
				return exp;
			}
		// case "array":
		// 	var res = [];
		// 	for(var e in exp) {
		// 		res.push(evaluateExpression(exp[e]));
		// 	}
		// 	return res;
		case "exp":
			return evaluateExpression(exp.body);
		case "assignment_exp":
			return evaluateAssignmentExpression(exp.body);
		case "add_exp":
			return evaluateAddExpression(exp.body);
		case "mult_exp":
			return evaluateMultExpression(exp.body);
		case "function_definition":
			return store_function(exp.body);
		case "function_call":
			return call_function(exp.body);
			break ;
		default:
			throw ("Unknown expression type: " + type);
	}
}

/**
 * Evaluate an assignment expression.
 * This amounts to evaluating the left side to an ID
 * and evaluating the right side to a value
 * Then check if the RHS is an ID, if it is, look it up in the symbol table
 * and set the value for the LHS ID accordingly. Otherwise if its a value,
 * set the symbol table for the LHS ID to the value.
 **/
function evaluateAssignmentExpression(exp) {
	var LHS = evaluateExpression(exp[0]);

	// Make sure the LHS is an ID
	if(LHS.type !== "id") {
		throw "Assignment expression error: LHS is not an identifier.";
	}
	LHS = LHS.value;

	var assignmentType = exp[1];
	var RHS = evaluateExpression(exp[2], true);

	if(assignmentType.value === "is") {
		return store(LHS, RHS);
	}
	
	throw "Unrecognized assignment operator: " + assignmentType.value;
}

/**
 * Evaluates an add expression.
 **/
function evaluateAddExpression(exp) {
	// Evaluate the left and right side.
	var LHS = evaluateExpression(exp[0], true);
	if(exp.length === 1) {
		return LHS;
	}
	LHS = LHS.value;

	var operator = exp[1];

	if(operator.type !== "add_operator") {
		throw "Add expression, invalid operator: " + operator.type;
	}

	var RHS = evaluateExpression(exp[2], true).value;

	// TODO: Get the types right here, assuming num for now...
	switch(operator.value) {
		case "+":
			return {"type":"num", "value":LHS + RHS};
		case "-":
			return {"type":"num", "value":LHS - RHS};
		default:
			throw "Unknown Add operator: " + operator.value;
	}
}

/**
 * Evaluates an mult expression.
 **/
function evaluateMultExpression(exp) {
	// Evaluate the left and right side.
	var LHS = evaluateExpression(exp[0], true);

	if(exp.length === 1) {
		return LHS;
	}

	var operator = exp[1];
	var RHS = evaluateExpression(exp[2], true);

	if(operator.type !== "mult_operator") {
		throw "Mult expression, invalid operator: " + operator.type;
	}

	switch(operator.value) {
		case "*":
			return LHS * RHS;
		case "/":
			return LHS / RHS;
		case "%":
			return LHS % RHS;
		default:
			throw "Unknown Mult operator: " + operator.value;
	}
}

// Create the parser
var parser = Parser.CreateWithLexer(parserDescription);

parser.getLexer().on("token", function(tok){
	// console.log("tok", tok);
});

parser.on("production", function(token_stack){
	// console.log("prod:", token_stack);
});

parser.on("accept", function(token_stack){
	// console.log("\n\nParser Accept:" + parser.prettyPrint(""));
});

parser.on("error", function(error){
	console.log("Parse Error: ", error.message);
	throw error.message;
});

parser.on("statement", function(exp){
	var res = evaluateExpression(exp);
	if(res) {
		console.log(res);
	}
});

var fs = require('fs'),
    readline = require('readline');

var rd = readline.createInterface({
    input: fs.createReadStream(__dirname + '/test.jspc'),
    output: process.stdout,
    terminal: false
});

rd.on('line', function(line) {
	console.log("read", line);
    parser.append(line + "\n");
});

rd.on('close', function() {
	console.log("done reading");
    parser.end();
});
