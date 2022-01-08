import path from 'path';

import express from 'express';
import logger from 'morgan';
import neo4j from 'neo4j-driver'

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

const driver: typeof neo4j.Driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', 'test'))
const session: typeof  neo4j.Session = driver.session();

interface CyperQuery {
    statement: string,
    params?: object
}

interface Repos {
    id: number,
    name: string
}

interface Images {
    id: number,
    digest: string,
    osarch: string,
    compressedsizemb: number
}

const executeCypherQuery = async (options: CyperQuery) => {
    try {
      const result = await session.run(options.statement, options.params || {});
      return result
    } catch (error) {
      throw error;
    }
}


app.get('/', async (_, res) => {
    const repoResult = await executeCypherQuery({ 
        statement: `MATCH(n:ContainerRepository) RETURN (n)`
     })
    const imageResult = await executeCypherQuery({
        statement: `MATCH(n:ContainerImage) RETURN (n)`
    })

    let repos: Repos[] = [];
    repoResult.records.forEach((record: any ) => {
        repos.push({
            id: record._fields[0].identity.low,
            name: record._fields[0].properties.name,
        })
    }) 

    let images: Images[] = [];
    imageResult.records.forEach((record: any ) => {
        images.push({
            id: record._fields[0].identity.low,
            digest: record._fields[0].properties.digest,
            osarch: record._fields[0].properties.osarch,
            compressedsizemb: record._fields[0].properties.compressedsizemb
        })
    })

    res.render('index', { repos, images });
})

app.post('/image/add', async (req, res) => {
    const digest = req.body.digest
    const osarch = req.body.osarch
    const compressedsizemb = req.body.compressedsizemb

    const params = {
       digest,
       osarch,
       compressedsizemb
    };

     await executeCypherQuery({
        statement: `CREATE(n:ContainerImage {digest:$digest, osarch:$osarch, compressedsizemb:$compressedsizemb}) RETURN n`,
        params
    })
    res.redirect("/")
})

app.post('/repo/add', async (req, res) => {
    const name = req.body.name

    const params = { name };

     await executeCypherQuery({
        statement: `CREATE (n:ContainerRepository{name:$name})`,
        params
    })
    res.redirect("/")
})

app.post('/repo/image/add', async (req, res) => {
    const image = req.body.image
    const repo = req.body.repo

    const params = { image, repo }

    await executeCypherQuery({
        statement: `MATCH (image:ContainerImage), (repo:ContainerRepository)
        WHERE repo.name = $repo AND image.digest = $image
        CREATE (repo)-[r:TAG]->(image);`,
        params
    })
    res.redirect("/")
})

const PORT = 9800
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})

module.exports = app
