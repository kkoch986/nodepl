
console.verbose = (...stuff) => false;

import Indexer from "../indexer";

/**
 * Test all unification of different types of literals
 */
describe("[Indexer] [Unification] [Literals]", function() {

    it("should unify exact ids", () => {
        const indexer = new Indexer();

        const termA = {
            head: "literal",
            body: [{
                type: "id",
                value: "a"
            }]
        };

        const termB = {
            head: "literal",
            body: [{
                type: "id",
                value: "a"
            }]
        };

        expect(indexer.unify(termA, termB)).toEqual({});
    });

    it("should not unify mismatched ids", () => {
        const indexer = new Indexer();

        const termA = {
            head: "literal",
            body: [{
                type: "id",
                value: "a"
            }]
        };

        const termB = {
            head: "literal",
            body: [{
                type: "id",
                value: "b"
            }]
        };

        expect(indexer.unify(termA, termB)).toEqual(false);
    });

    it("should not unify 1 and '1'", () => {
        const indexer = new Indexer();

        const termA = {
            head: "literal",
            body: [{
                type: "string-literal",
                value: "1"
            }]
        };

        const termB = {
            head: "literal",
            body: [{
                type: "numeric-literal",
                value: "1"
            }]
        };

        expect(indexer.unify(termA, termB)).toEqual(false);
    });

    it("should unify 1 and 1", () => {
        const indexer = new Indexer();

        const termA = {
            head: "literal",
            body: [{
                type: "numeric-literal",
                value: "1"
            }]
        };

        const termB = {
            head: "literal",
            body: [{
                type: "numeric-literal",
                value: "1"
            }]
        };

        expect(indexer.unify(termA, termB)).toEqual({});
    });

    it("should unify 1 and 1 (mismatched by the parser)", () => {
        const indexer = new Indexer();

        const termA = {
            head: "literal",
            body: [{
                type: "numeric-literal",
                value: 1
            }]
        };

        const termB = {
            head: "literal",
            body: [{
                type: "numeric-literal",
                value: "1"
            }]
        };

        expect(indexer.unify(termA, termB)).toEqual({});
    });


    it("should unify a and 'a'", () => {
        const indexer = new Indexer();

        const termA = {
            head: "literal",
            body: [{
                type: "string-literal",
                value: "a"
            }]
        };

        const termB = {
            head: "literal",
            body: [{
                type: "id",
                value: "a"
            }]
        };

        expect(indexer.unify(termA, termB)).toEqual({});
    });

});

/**
 * Test unification that involves simple variables
 */
describe("[Indexer] [Unification] [Variables]", function() {
    it("should bind 2 variables to each other", () => {
        const indexer = new Indexer();

        const termA = {
            type: "variable_name",
            value: "A"
        };

        const termB = {
            type: "variable_name",
            value: "B"
        };
        expect(indexer.unify(termA, termB)).toEqual({"A": {type: "variable_name", value: "B"}});
    });

    it("should bind variables in alphabetical order", () => {
        const indexer = new Indexer();

        const termA = {
            type: "variable_name",
            value: "B"
        };

        const termB = {
            type: "variable_name",
            value: "A"
        };
        expect(indexer.unify(termA, termB)).toEqual({"A": {type: "variable_name", value: "B"}});
    });
});


/**
 * Unifying terms
 */
// describe("[Indexer] [Unification] [Terms]", function(){
//     it("should bind some terms to a variable", () => {
//
//     })
// });
