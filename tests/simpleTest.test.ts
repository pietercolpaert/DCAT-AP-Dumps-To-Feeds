import { assert } from "chai";
import { RdfStore } from "rdf-stores";
import { Level } from "level";
import { main } from "../index"
import * as N3 from "n3";
import { DataFactory } from "rdf-data-factory";
const df: DataFactory = new DataFactory();


function testCorrectness(log: string, value: string | undefined, type: string) {
    const parser = new N3.Parser();
    const quads = parser.parse(log); 
    const store = RdfStore.createDefault();
    for (let quad of quads) {
        store.addQuad(quad);
    }

    const members = store.getQuads(null, df.namedNode("https://w3id.org/tree#member"), null).map((quad) => {
            return quad.object;
        });
    assert(members.length == 1, "expected one member in the case of a " + type);
    const member = members[0];
    const types = store.getQuads(member,df.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), null).map((quad) => {
        return quad.object;
    });
    assert(types.length == 1, "expected one type");
    assert(types[0].value == type, "expected correct type " + type);

    if (value) {
        //look up the value in the named graph
        const foundValue = store.getQuads(null, df.namedNode("http://example.org/value"), null, member).map((quad) => {
            return quad.object;
        });
        assert(foundValue[0].value == value, "expected correct value " + value);
    }

}

describe("Simple test case with a create, a change and a removal", () => {
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
        testCorrectness(deleteLog, undefined, "https://www.w3.org/ns/activitystreams#Delete")
        console.log = deleteOldLog

    });
});
