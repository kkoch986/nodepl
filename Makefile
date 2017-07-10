

query:
	npm start -- -q output/index.json

compile:
	npm start -- input/test.npl --output output/index.json 

chords:
	npm start -- input/chords.P --output output/chords.json
	npm start -- -q output/chords.json

list:
	npm start -- input/list.P --output output/list.json
	npm start -- -q output/list.json

# chord(Chord, Format, E,A,D,G,B,HighE), note(0,HighE,NoteHighE), note(1, B, NoteB), note(2, G, NoteG), note(3, D, NoteD), note(4, A, NoteA), note(5, E, NoteE).


rdf:
	npm start -- ../btc/data/persondata_en.ttl --output output/rdf.json
	npm start -- -q output/rdf.json
