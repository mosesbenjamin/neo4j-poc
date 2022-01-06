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



app.get('/', (req, res) => {
    session
    .run('MATCH(n) RETURN (n)')
    .then((res) => {
        res.records.forEach((record: any) => {
            console.log(record._fields[0].properties)
        })
    })
    .catch((err) => console.error(err))
    res.send('Holla!')
})

const PORT = 9800
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})

module.exports = app
