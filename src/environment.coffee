
###
# Define the environment class which will be passed along to the evaluation functions
# it is a recursive structure with references to the parent stack frames.
#
# The environment class will also define functions for dereferencing variables and function 
# body lists.
###

class Env
	constructor: (@parent_env) ->
		@variable_store = {}
		@function_store = {}

	# Store variables by their IDs,
	# the stored value is like this:
	# id:{ "id_type":<declared type of the id>, "value":<value> }
	# Value must be a fully evaluated expression tagged with a type
	# Type will be checked against declared type for value if one exists
	# otherwise the type will be set based on the type accompanying the id
	# if the id is not tagged with a type and the id has not been previously assigned a type, 
	# an exception will be raised
	#
	# When storing a variables value, scope will dictate that we look in this stack frame first
	# if a type is provided, we will create an entry in the local stack frame if not we will work our 
	# way to the topmost env frame to find the variable that matches the id.
	store: (tagged_id, value) ->
		id = tagged_id.id
		type = tagged_id.type ? false

		# if a type is given, check if this variable has already been declared in the local scope
		if(type != false)
			if(this.variable_store[id])
				throw "Variable " + id + " already defined in this scope."

			# if its not already defined, the presence of a type means we will declare it
			# in this scope regardless of its outside existance
			if(type != value.type)
				throw "Cannot assign " + value.type + " to a variable declared as " + type

			this.variable_store[id] = { "id_type":type, "value":value.value }
		else 
			# if no type is provided, attempt to resolve the name in the nearest possible scope
			resolved_id = this.resolve_id(id, true)

			# check the types
			if(resolved_id.id.type != value.type) 
				throw "Cannot assign " + value.type + " to a variable declared as " + resolved_id.id.type

			# complete the assignment
			resolved_id.env.variable_store[id].value = value.value

		console.log("[STORE]", id, type, value);
		value

	# Search recursively up the stack for the given id.
	# if its found, return the type and value of the matched value { "type":<type>, "value":<value> }
	# if include == true, the result will be simply the type and value of the resovlved 
	# return { "env":<the env that it was found in>, "id":<the stored id and type> }
	resolve_id: (id_label, includeEnv = false) ->
		console.log("[RESOLVE] ", id_label)

		# check in this scope
		if(this.variable_store[id_label])
			resolved = this.variable_store[id_label]
			ret = { "type": resolved.id_type, "value": resolved.value }
			if(includeEnv)
				{ "env":this, "id": ret }
			else 
				ret

		else if(!this.parent_env)
			throw "Symbol " + id_label + " not declared."
		else 
			this.parent_env.resolve_id(id_label)

	# Attempt to store a function
	store_function: (id_label, arg_def_list, return_type, function_body) ->
		console.log("[STORE FN]", id_label, arg_def_list, return_type, function_body)
		

(exports ? this).Env = Env;