

query:
	npm start -- -q index.json

compile:
	npm start -- input/test.npl --output index.json


chords:
	npm start -- input/chords.P --output chords.json
	npm start -- -q chords.json

list:
	npm start -- input/list.P --output list.json -v

# chord(Chord, Format, E,A,D,G,B,HighE), note(0,HighE,NoteHighE), note(1, B, NoteB), note(2, G, NoteG), note(3, D, NoteD), note(4, A, NoteA), note(5, E, NoteE).
