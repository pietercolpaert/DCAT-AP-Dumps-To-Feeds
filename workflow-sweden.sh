FEEDNAME=sweden
DUMPFILENAME=tmp123-sweden.ttl
DUMPURL=https://admin.dataportal.se/all.rdf
npx ldfetch $DUMPURL > $DUMPFILENAME
[ -d $FEEDNAME ] || mkdir $FEEDNAME
# assuming we will only fetch updates each day
ts-node bin/dumpsToFeed.ts $FEEDNAME $DUMPFILENAME > $FEEDNAME/$(date +'%Y-%m-%d').ttl
[ -s $FEEDNAME/$(date +'%Y-%m-%d').ttl ] || rm $FEEDNAME/$(date +'%Y-%m-%d').ttl

## Now build a feed.ttl file that indexes all these files and adds the necessary DCAT-AP Feeds descriptions in the root.
touch $FEEDNAME/feed.ttl

rm $DUMPFILENAME

## interesting idea: page size should be equal to the duration of your recommended catch up time. E.G., if you want data portals to catch up once per day, your changes should be paginated per day.