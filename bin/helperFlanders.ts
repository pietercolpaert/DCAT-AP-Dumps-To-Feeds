// There’s a problem with the way the pagination works, so we’ll have to manually parse the pages and output it to a file.

import rdfDereferencer from "rdf-dereference";
import N3 from 'n3';
//const streamWriter: N3.StreamWriter = new N3.StreamWriter({ prefixes: {} });
//streamWriter.pipe(process.stdout);
const writer = new N3.Writer(process.stdout, { end: false, prefixes: { c: 'http://example.org/cartoons#' } });

let main = async function (url: string) {
    console.error('Requesting ' + url);
    const { data } = await rdfDereferencer.dereference(url);    
    let nextPage = "";
    data.on("data", (quad) => {
        if (quad.predicate.value === "http://www.w3.org/ns/hydra/core#nextPage"){ 
            nextPage = quad.object.value;
        }
        writer.addQuad(quad);  
    });
    data.on("end", () => {
        //Let’s download the next page if it exists
        if (nextPage !== '') {
            main(nextPage);
        } else {
            writer.end();
        }
    })
}

main('https://dev.metadata.vlaanderen.be/srv/api/records?hitsPerPage=50&from=1&to=50&facet.q=isOpenData%2Fy');
