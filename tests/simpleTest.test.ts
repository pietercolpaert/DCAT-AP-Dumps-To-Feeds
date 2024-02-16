import { assert } from "chai";
import { NamedNode, Parser, Store, StreamParser, Term, Writer } from "n3";
import { CBDShapeExtractor } from "extract-cbd-shape";
import rdfDereference from "rdf-dereference";
import { Level } from "level";
import { main } from "../index"
import * as N3 from "n3";

function testCorrectness(log: string, value: string | undefined, type: string) {
    const parser = new N3.Parser();
    const quads = parser.parse(log);
    const store = new N3.Store(quads);

    const members = store.getObjects(null, new
        N3.NamedNode("https://w3id.org/tree#member"), null);
    assert(members.length == 1, "expected one member");
    const member = members[0];
    const types = store.getObjects(member,
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", null);
    assert(types.length == 1, "expected one type");
    assert(types[0].value == type, "expected correct type " + type);

    if (value) {
        const foundValue = store.getObjects(null, "http://example.org/value", member);
        assert(foundValue[0].value == value, "expected correct value " + value);
    }

}

describe("Test CBD with named graph", () => {
    it("Tests for DCAT-AP feeds", async () => {
        const feedname = '';

        const inputCreateFile = __dirname + "/inputCreate.ttl"
        const db = new Level("state-of-" + feedname, { valueEncoding: 'json' })
        await db.clear();
        const createOldLog = console.log;
        let createLog = "";
        console.log = (item) => createLog = createLog + item;
        await main(db, feedname, inputCreateFile)
        console.log = createOldLog
        //console.log(createLog)
        testCorrectness(createLog, "42", "https://www.w3.org/ns/activitystreams#Create")

        const inputUpdateFile = __dirname + "/inputUpdate.ttl"
        const updateOldLog = console.log;
        let updateLog = "";
        console.log = (item) => updateLog = updateLog + item;
        await main(db, feedname, inputUpdateFile)
        testCorrectness(updateLog, "43", "https://www.w3.org/ns/activitystreams#Update")
        console.log = updateOldLog

        const inputDeleteFile = __dirname + "/inputDelete.ttl"
        const deleteOldLog = console.log;
        let deleteLog = "";
        console.log = (item) => deleteLog = deleteLog + item;
        await main(db, feedname, inputDeleteFile)
        testCorrectness(deleteLog, undefined, "https://www.w3.org/ns/activitystreams#Remove")
        console.log = deleteOldLog

    });
});
