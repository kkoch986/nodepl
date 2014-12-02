
Env = require("./environment").Env

class Runtime
	constructor: () ->
		@current_env = new Env()

	# Evaluate an expression
	evaluateExpression: (exp, resolveIds = false) ->
		type = if exp.head then exp.head else exp.type
		console.log("[EVAL]", type);

		switch type
			when "exp" 
				this.evaluateExpression(exp.body[0], resolveIds)
			when "assignment_exp"
				this.evaluateAssignmentExpression(exp.body[0], exp.body[1], exp.body[2])
			when "add_exp"
				this.evaluateAddExpression(exp.body)
			when "mult_exp"
				this.evaluateMultExpression(exp.body)
			when "literal"
				this.evaluateLiteral(exp.body[0])
			when "function_definition"
				this.evaluateFunctionDefinitionExpression(exp.body)
			when "id_exp"
				id = this.evaluateIdExpression(exp.body)
				if(resolveIds)
					this.current_env.resolve_id(id.id)
				else 
					id
			else
				throw "Unknown expression type: " + type

	# Evaluate an assignment expression
	evaluateAssignmentExpression: (lhs, operator, rhs) ->
		# LHS must be an ID
		if(lhs.head != "id_exp") 
			throw "Assignment expression, left-hand side must be an <id>."
		lhs = this.evaluateExpression(lhs)

		# evaluate the RHS
		rhs = this.evaluateExpression(rhs, true)

		# now decide what to do based on the operator
		switch operator.value
			when "is"
				this.current_env.store(lhs, rhs)
			else
				throw "Unrecognized assignment operator: " + operator

	# Evaluate an add_expression
	# Evaluates the LHS and checks if there is a RHS to evaluate
	evaluateAddExpression: (exp) ->
		lhs = this.evaluateExpression(exp[0], true)
		if exp.length == 1
			return lhs

		operator = exp[1].value
		rhs = this.evaluateExpression(exp[2], true)

		if(lhs.type == "num" && rhs.type == "num")
			switch(operator)
				when "+"
					{ "type":"num", "value": lhs.value + rhs.value } 
				when "-"
					{ "type":"num", "value": lhs.value - rhs.value } 
				else 
					throw "Unknown operator type for Addition Expression: " + operator
		else 
			throw "Addition expression not defined for " + lhs.type + " " + operator + " " + rhs.type

	# Evaluate an add_expression
	# Evaluates the LHS and checks if there is a RHS to evaluate
	evaluateMultExpression: (exp) ->
		lhs = this.evaluateExpression(exp[0], true)
		if exp.length == 1
			return lhs

		operator = exp[1].value
		rhs = this.evaluateExpression(exp[2], true)

		if(lhs.type == "num" && rhs.type == "num")
			switch(operator)
				when "*"
					{ "type":"num", "value": lhs.value * rhs.value } 
				when "/"
					{ "type":"num", "value": lhs.value / rhs.value } 
				when "%"
					{ "type":"num", "value": lhs.value % rhs.value } 
				else 
					throw "Unknown operator type for Multiplication Expression: " + operator
		else 
			throw "Multiplication expression not defined for " + lhs.type + " " + operator + " " + rhs.type

	# Evaluates a literal
	# will return an object of the form {type: <num|string>, value:<value>}
	evaluateLiteral: (literal) ->
		switch literal.type
			when "numeric-literal"
				{ "type":"num", "value":parseFloat(literal.value) }
			when "string-literal"
				{ "type":"string", "value":"" + literal.value }
			else
				throw "Unknown literal type: " + literal.type

	# Return a type for the given <type> production
	# currently returns either "num" or "string"
	getTypeForTypeExpression: (exp) ->
		exp = exp.body[0]
		type = exp.head ? exp.type
		switch type
			when "type_num"
				return "num"
			when "type_string"
				return "string"
			when "type_fn"
				throw "FN Type expression evaluation not implemented"
			else
				throw "Unknown literal type: " + literal.type		

	# Evaluate an id_exp
	# the task here is to determine if the ID is tagged with a type or not
	# and return an ID object of one of the forms:
	# { "type":<declared type>, "id":<the id value> }
	# or
	# { "id":<the id value> }
	evaluateIdExpression: (id_exp) ->
		if id_exp.length == 1
			{ "id": id_exp[0].value }
		else
			{ "type":this.getTypeForTypeExpression(id_exp[0]), "id":id_exp[1].value }

	# Evaluate a function definition
	# most the work for this is done by the environment
	evaluateFunctionDefinitionExpression: (exp) ->
		fn_name = exp[0].value
		args = exp[1].body
		return_type = exp[2].body[0]
		body = exp[3].body
		this.current_env.store_function(fn_name, args, return_type, body)

(exports ? this).Runtime = Runtime