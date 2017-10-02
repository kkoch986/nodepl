

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

rdf:
	npm start -- ../btc/data/persondata_en.ttl --output output/rdf.json
	npm start -- -q output/rdf.json


test:
	npm start -- input/test.npl --output output/test.json
	npm start -- -q output/test.json
