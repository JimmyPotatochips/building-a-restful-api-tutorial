/*
 *  Primary file for the API
 *
 * 
*/

/* Dependencies */
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');

/* Instantiate the HTTP server */
let httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
});

/* Start the HTTP server */
httpServer.listen(config.httpPort, () => console.log(`The http server is listening on Port ${config.httpPort} in ${config.envName} mode!`));

/* Instantiate the HTTPS server */
let httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};

let httpsServer = https.createServer(httpsServerOptions, (req, res) => unifiedServer(req, res));

/* Start the HTTPS server */
httpsServer.listen(config.httpsPort, () => console.log(`The https server is listening on Port ${config.httpsPort} in ${config.envName} mode!`));

let handlers = {
    ping: (data, callback) => {
        callback(200);
    },
    notFound: (data, callback) => {
        callback(404);
    }
};

let router = {
    'ping': handlers.ping
};

let unifiedServer = ((req, res) => {
    // Get the URL and parse it
    let parsedURL = url.parse(req.url, true);

    // Get the path
    let path = parsedURL.pathname;
    let trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string parameters as an object
    let queryStringObject = parsedURL.query;

    // Get the HTTP action
    let action = req.method.toLowerCase();

    // Get the headers as an object
    let headers = req.headers;

    // Get the payload, if any
    let decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', (data) => {
        buffer += decoder.write(data);
    });
    req.on('end', () => {
        buffer += decoder.end();

        // Create the data to send back
        let data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'action': action,
            'headers': headers,
            'payload': buffer
        };

        let chosenHandler = typeof (router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        // Route the request to the handler specified in the request
        chosenHandler(data, (statusCode, payload) => {
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;
            payload = typeof (payload) == 'object' ? payload : {};

            let payloadString = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            console.log('Returning response: ', statusCode, payloadString);
        });

    });
});