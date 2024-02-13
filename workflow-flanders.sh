## Mind that this workflow has a dependency on also rapper (deb package raptor2-utils) to be installed (next to ts-node)
FEEDNAME=flanders
DUMPFILENAME=tmp123-flanders.ttl

# Create the directory if it doesn’t exist yet, and consequentially, create the feed.ttl root file.
[ -d $FEEDNAME ] || { mkdir $FEEDNAME; cat > $FEEDNAME/feed.ttl << EOF
@prefix as: <https://www.w3.org/ns/activitystreams#>.
@prefix dcat: <http://www.w3.org/ns/dcat#>.
@prefix tree: <https://w3id.org/tree#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix ldes: <https://w3id.org/ldes#>.
<feed> a ldes:EventStream ;
    ldes:timestampPath as:published ;
    ldes:versionOfPath as:object ;
    tree:view <feed.ttl> .
EOF
}

# Next, we fetch the (new) dump
ts-node bin/helperFlanders.ts > $DUMPFILENAME
tsc
# assuming we will only fetch updates each day, we can name the files according to today’s date
node --max-old-space-size=8192 dist/bin/dumpsToFeed.js $FEEDNAME $DUMPFILENAME > $FEEDNAME/$(date +'%Y-%m-%d').trig
# If they file isn’t empty, add relations to the file from the feed.ttl. Remove the file if it’s empty as that means there are no updates for today. 
[ -s $FEEDNAME/$(date +'%Y-%m-%d').trig ] && { cat >> $FEEDNAME/feed.ttl << EOF
<feed.ttl> tree:relation [
        a tree:GreaterThanOrEqualToRelation ;
        tree:path as:published ;
        tree:value "$(date +'%Y-%m-%d')T00:00:00Z"^^xsd:dateTime ;
        tree:node <$(date +'%Y-%m-%d').trig>
    ] ,
    [
        a tree:LessThanOrEqualToRelation ;
        tree:path as:published ;
        tree:value  "$(date +'%Y-%m-%d')T23:59:99Z"^^xsd:dateTime ;
        tree:node <$(date +'%Y-%m-%d').trig>
    ] .
EOF
}|| rm $FEEDNAME/$(date +'%Y-%m-%d').trig

# Remove the dump file as we won’t need it anymore and it’s nice to have a clean repo
rm $DUMPFILENAME