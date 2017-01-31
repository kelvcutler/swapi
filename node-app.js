var express      = require('express'),
    request      = require('request'),
    app          = express(),
    path         = require('path'),
    baseSwapiUrl = 'http://swapi.co/api/',
    _            = require('lodash'),
    server;

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render('index');
});

app.get('/character/:name', (req, res) => {
    request(baseSwapiUrl + 'people/?search=' + req.params.name, function(err, result) {
        try {
            let body = typeof(result.body) === 'object' ? result.body : JSON.parse(result.body);
            if (err || body.count === 0) {
                res.render('notFound', { search: { name: req.params.name } });
            } else {
                res.render('character', {person: body.results[0], search: { name: req.params.name }});
            }
        } catch(e) {
            res.render('notFound', { search: { name: req.params.name } });
        }
    });
});

function getAllPeople(nextUrl) {
    return new Promise((resolve, reject) =>  {
        request(nextUrl ? nextUrl : baseSwapiUrl + 'people/', function(err, result) {
            try {
                let body = typeof(result.body) === 'object' ? result.body : JSON.parse(result.body);
                if (err || body.count === 0) {
                    reject([]);
                } else if (body.next) {
                    getAllPeople(body.next).then((nextPeople) => {
                        resolve(_.concat(body.results, nextPeople));
                    });;
                } else {
                    resolve(body.results);
                }
            } catch(e) {
                reject([]);
            }
        });
    });
}

function getAllObjects(objectName, nextUrl) {
    return new Promise((resolve, reject) =>  {
        request(nextUrl ? nextUrl : baseSwapiUrl + `${objectName}/`, function(err, result) {
            try {
                let body = typeof(result.body) === 'object' ? result.body : JSON.parse(result.body);
                if (err || body.count === 0) {
                    reject([]);
                } else if (body.next) {
                    getAllObjects(objectName, body.next).then((nextObjects) => {
                        resolve(_.concat(body.results, nextObjects));
                    });;
                } else {
                    resolve(body.results);
                }
            } catch(e) {
                reject([]);
            }
        });
    });
}

app.get('/characters', (req, res) => {
    getAllObjects('people').then((allPeople) => {
        if (req.query.sort) {
            if (req.query.sort === "mass" || req.query.sort === "height") {
                allPeople = _.sortBy(allPeople, (person) => { return parseInt(person[req.query.sort].replace(',','')); });
            } else {
                allPeople = _.sortBy(allPeople, [req.query.sort]);
            }
        }
        res.send(_.slice(allPeople, 0, Math.min(allPeople.length,50)));
    }).catch(() => {
        res.status(500).send([]);    
    });
});

app.get('/planetswithresidents', (req, res) => {
    var allPeoplePromise = getAllObjects('people'), 
        allPlanetsPromise = getAllObjects('planets');
    Promise.all([allPeoplePromise, allPlanetsPromise]).then((results) => {
        var allPeople = results[0],
            allPlanets = results[1],
            peopleMap = {},
            planetsWithResidents = {};
        allPeople.forEach((person) => {
            peopleMap[person.url] = person;
        });
        allPlanets.forEach((planet) => {
            planetsWithResidents[planet.name] = _.map(planet.residents, (resident) => { return peopleMap[resident].name; });
        });
        res.send(planetsWithResidents);
    }).catch((e) => {
        res.status(500).send([]);    
    });
});

server = app.listen(3000, function() {
  var host = server.address().address,
      port = server.address().port;

  console.log('API listening at http://%s:%s', host, port);
});