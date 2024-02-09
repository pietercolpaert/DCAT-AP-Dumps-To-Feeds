# From DCAT-AP dumps to feeds

When no state is provided, the script is going to extract all entities and mention them as `as:Create`s. When a state is already present, it is going to compare all entities with a fingerprint and check whether the set of triples changed, and whether the entity is still present. New entities can also be added.

Clone the repo, fetch a dataset, and execute `ts-node index.ts`.

Options:
 * `--flush` clears the state

## Datasets to use

 * Build a file sweden.ttl from https://admin.dataportal.se/all.rdf
 * Build a file flanders.ttl from https://dev.metadata.vlaanderen.be/srv/api/records?hitsPerPage=50&from=1&to=50&facet.q=isOpenData%2Fy


E.g., using `ldfetch https://admin.dataportal.se/all.rdf > sweden.ttl` (you can install ldfetch using `npm install -g ldfetch`)