
(exports ? this).Grammar = 
	"symbols":
		"numeric-literal": 
			"terminal":true
			"match":"[0-9]*\\.?[0-9]+"
			"matchCaseInsensitive":true
		"string-literal":
			"terminal":true
			"match":"\"(.*)\""
		"id":
			"terminal":true
			"match":"[a-zA-Z0-9_]+"

		# Operators and symbols
		"assignment_operator":
			"terminal":true
			"match":"((=)|(\\*=)|(/=)|(\\%=)|(\\+=)|(\\-=))"

		"add_operator":
			"terminal":true
			"match":"((\\+)|(\\-))"
			"lookAhead":"[^=]"

		"mult_operator": 
			"terminal":true
			"match":"((\\*)|(/)|(%))"
			"lookAhead":"[^=]"

		"open_paren": 
			"terminal":true
			"match":"\\("
			"excludeFromProduction":true

		"close_paren":
			"terminal":true
			"match":"\\)"
			"excludeFromProduction":true

		"semicolon": 
			"terminal":true
			"match":";"
			"excludeFromProduction":true

		"dot":
			"terminal":true
			"match":"\\."
			"excludeFromProduction":true

		"arrow":
			"terminal":true
			"match":"(->)"
			"excludeFromProduction":true	

		"comma":
			"terminal":true
			"match":"(,)"
			"excludeFromProduction":true
		"colon":
			"terminal":true
			"match":"(:)",
			"excludeFromProduction":true

		# Keywords
		"kw_is":
			"terminal":true
			"match":"(is)"
			"priority":10

		"kw_fn":
			"terminal":true
			"match":"(fn)"
			"priority":10
			"excludeFromProduction":true

		# Types
		"type_num":
			"terminal":true
			"match":"(num)"
			"priority":10

		# Things to remove from the parse
		"whitespace": 
			"terminal":true
			"match":"[ \n\t]+"
			"includeInStream":false

		"comment_#": 
			"terminal":true
			"match":"#([^\n]*)[\r]?[\n]"
			"includeInStream":false
			"priority":1000

		"comment_multiline": 
			"terminal":true
			"match":"###((.|[\r\n])*?)###"
			"includeInStream":false
			"priority":1000

		# Non-terminals
		"statement_list":
			"terminal":false
			"mergeRecursive":true

		"primary_exp":
			"terminal":false
			"mergeIntoParent":true

		"arg_def_list":
			"terminal":false
			"mergeRecursive":true

		"arg_list":
			"terminal":false
			"mergeRecursive":true

		"type_list":
			"terminal":false
			"mergeRecursive":true

	"productions":
		"literal": [
			[ "numeric-literal" ],
			[ "string-literal" ]
		]
		"statement_list":[
			[ "statement_list", "statement", "dot" ],
			[ "statement", "dot" ]
		]
		"statement":[
			[ "exp" ],
			[ "function_definition" ]
		]
		"exp":[
			["assignment_exp"],
			["add_exp"]
		]
		"primary_exp":[
			[ "open_paren", "exp", "close_paren"],
			[ "id_exp" ],
			[ "literal" ],
			[ "function_call" ]
		]
		"id_exp":[
			[ "type", "id" ],
			[ "id" ]
		],
		"add_exp":[
			[ "mult_exp", "add_operator", "add_exp" ],
			[ "mult_exp" ]
		]
		"mult_exp":[
			[ "primary_exp", "mult_operator", "mult_exp" ],
			[ "primary_exp" ]
		]
		"assignment_exp":[
			[ "primary_exp", "kw_is", "exp" ]
		]

		# Function definitions
		"function_definition":[
			[ "kw_fn", "id", "open_paren", "arg_def_list", "close_paren", "colon", "type", "function_body" ],
			[ "kw_fn", "id", "open_paren", "close_paren", "colon", "type", "function_body" ],
			[ "anonymous_function_definition" ]
		]
		"anonymous_function_definition":[
			[ "kw_fn", "open_paren", "arg_def_list", "close_paren", "colon", "type", "function_body" ],
			[ "kw_fn", "open_paren", "close_paren", "colon", "type", "function_body" ],
			[ "kw_fn", "colon", "type", "function_body" ]
		],
		"function_body":[
			["arrow", "exp"],
			["arrow", "function_definition"]
		]
		"arg_def_list":[
			[ "arg_def_list", "comma", "arg_def" ],
			[ "arg_def" ]
		]
		"type":[
			[ "type_num" ],
			[ "type_fn" ]
		],
		"type_fn":[
			[ "open_paren", "type_list", "close_paren", "colon", "type" ],
			[ "open_paren", "close_paren", "colon", "type" ],
			[ "colon", "type" ]
		],
		"type_list":[
			[ "type_list", "comma", "type" ],
			[ "type" ]
		]
		"arg_def":[
			[ "type", "id" ],
			[ "literal" ]
		]

		# Function Calls
		"function_call":[
			[ "id", "open_paren", "arg_list", "close_paren" ]
		]
		"arg_list":[
			[ "exp", "comma", "arg_list" ],
			[ "exp" ]
		]

	"startSymbols": [ "statement_list" ]