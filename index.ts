import rdfDereferencer from "rdf-dereference";
import {CBDShapeExtractor} from "extract-cbd-shape";
const {canonize} = require('rdf-canonize');
import { createHash } from 'node:crypto';
import { RdfStore } from 'rdf-stores';
import { DataFactory } from 'rdf-data-factory';
import N3 from 'n3';
import { Quad, Term, NamedNode, BlankNode } from "@rdfjs/types";

const df: DataFactory = new DataFactory();

// Helper function to make loading a quad stream in a store a promise
let loadQuadStreamInStore = function (store: RdfStore, quadStream: any) {
    return new Promise((resolve, reject) => {
      store.import(quadStream).on("end", resolve).on("error", reject);
    });
}

let processActivity = function (quads: Array<any>, type: NamedNode, iri: NamedNode, hash:string) {
    // TODO: Instead of writing this to stdout as trig, we should use a JS Writer here of the connector architecture, so we can pipe it to an LDES server
    let writer = new N3.Writer({"format": "application/trig"});
    //create new relative IRI for the activity based on the hash of the activity
    let subject = df.namedNode("#" + hash);
    // Let’s call our LDES a relative IRI `feed`, assuming another script will put it in the right place and use that LDES IRI. We might make this configurable though.
    writer.addQuads([
        df.quad(df.namedNode("feed"),df.namedNode("https://w3id.org/tree#member") , subject),
        df.quad(subject, df.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), type),
        df.quad(subject, df.namedNode("https://www.w3.org/ns/activitystreams#object"), iri),
        df.quad(subject, df.namedNode("https://www.w3.org/ns/activitystreams#published"), new N3.Literal("\"" + (new Date()).toISOString()+ "\"^^http://www.w3.org/2001/XMLSchema#dateTime")),
    ]);

    for (let quad of quads) {
        writer.addQuad(quad.subject,quad.predicate, quad.object, subject);
    }

    writer.end((error, result) => {
        console.log(result);
    });
}

export async function main (db:any, feedname:string, filename:string) {
    const store: RdfStore = RdfStore.createDefault();;
    const { data } = await rdfDereferencer.dereference(filename, { localFiles: true });
    await loadQuadStreamInStore(store, data);
    //Todo: create a shape for the entities in the stream and let’s extract them accordingly
    let extractor = new CBDShapeExtractor();
    let subjects = getStandaloneEntitySubjects(store);

    for (let subject of subjects) {
        if (subject.termType === 'BlankNode') {
            console.error("A DCAT-AP embedded entity (type " + store.getQuads(subject, df.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),null)[0].object.value + ") cannot be a blank node!");
            //Let’s skip this entity
            continue;
        } else if( subject.termType === 'NamedNode' ) {
            let entityquads = await extractor.extract(store, subject);
            // Alright! We got an entity!
            // Now let’s first create a hash to check whether the set of triples changed since last time.
            // We’ll use a library to make the entity description canonized -- see https://w3c.github.io/rdf-canon/spec/
            let canonizedString = await canonize(entityquads,{algorithm: 'RDFC-1.0'});
            //Now we can hash this string, for example with MD5
            let hashString = createHash('md5').update(canonizedString).digest('hex');
            //now let’s compare our hash with the hash in our leveldb key/val store.
            try {
                let previousHashString = await db.get(subject.value);            
                if (previousHashString !== hashString) {
                    //An Update!
                    processActivity(entityquads, df.namedNode("https://www.w3.org/ns/activitystreams#Update"), subject, hashString);
                    //We could also not await here, as there’s nothing keeping us from continuing
                    await db.put(subject.value,hashString);
                } else {
                    //Remained the same: do nothing
                    //console.log("Remained the same", subject);
                }
            } catch (e) {
                processActivity(entityquads, df.namedNode("https://www.w3.org/ns/activitystreams#Create"), subject, hashString);
                //PreviousHashString hasn’t been set, so let’s add a create in our stream
                //We could also not await here, as there’s nothing keeping us from continuing
                await db.put(subject.value,hashString);
            }
        }
    }
    //We still need to detect deletions: something that has been in our leveldb previously, but isn’t anymore
    let keys = await db.keys().all();
    //loop over the keys and check whether they are set in the store. If there are keys that weren’t set before, it’s a deletion!
    for (let key of keys) {        
        if (store.getQuads(df.namedNode(key),null,null).length === 0) {
            processActivity([], df.namedNode("https://www.w3.org/ns/activitystreams#Delete"), df.namedNode(key), "deletion-" + encodeURIComponent(key));
            //and remove the entry in leveldb now so it doesn’t appear as removed twice in the feed on the next run
            await db.del(key);
        }
    }
}


//Extract standalone entities according to the DCAT-AP Feeds spec:
//dcat:Catalog, dcat:Dataset, dcat:Distribution, dcat:DataService, foaf:Agent, vcard:Kind, dcterms:LicenseDocument
// Would be nice to make this configurable, so that we can use the script for other on-boardings as well.
let getStandaloneEntitySubjects = function (store: RdfStore) {
    let result:Array<Term> = [];
    result = result.concat(store.getQuads(null, null, df.namedNode("http://www.w3.org/ns/dcat#Catalog")).map((quad): Term => {
        return quad.subject;
    }));
    result = result.concat(store.getQuads(null, null, df.namedNode("http://www.w3.org/ns/dcat#Dataset")).map((quad): Term => {
        return quad.subject;
    }));
    result = result.concat(store.getQuads(null,null, df.namedNode("http://www.w3.org/ns/dcat#Distribution")).map((quad): Term => {
        return quad.subject;
    }));
    result = result.concat(store.getQuads(null,null, df.namedNode("http://www.w3.org/ns/dcat#DataService")).map((quad): Term => {
        return quad.subject;
    }));
    result = result.concat(store.getQuads(null,null, df.namedNode("http://xmlns.com/foaf/0.1/Agent")).map((quad): Term => {
        return quad.subject;
    }));
    result = result.concat(store.getQuads(null,null, df.namedNode("http://www.w3.org/2006/vcard/ns#Kind")).map((quad): Term => {
        return quad.subject;
    }));
    result = result.concat(store.getQuads(null,null, df.namedNode("http://purl.org/dc/terms/LicenseDocument")).map((quad): Term => {
        return quad.subject;
    }));
    return result;
}
