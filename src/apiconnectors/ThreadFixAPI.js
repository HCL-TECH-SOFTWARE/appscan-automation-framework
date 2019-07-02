const config = require('../../config/config');
const request = require('request');

module.exports = {

    doGet: function(url) {
        return new Promise((resolve, reject) => {

            let headerInfo = {
                headers: {
                    Accept: 'application/json',
                    Authorization: 'APIKEY ' + config.threadFixAPIKey
                }
            };

            request({
                headers: headerInfo.headers,
                url: config.threadFixRESTURL + url,
                method: 'GET',
                json: true,
                rejectUnauthorized: false
            }, function(error, response, body) {
                if (error) {
                    reject(error);
                } else if (!body.success) {
                    reject(body.message);
                } else {
                    resolve(response);
                }
            })

        });
    },

    doPost: function(url, body) {
        return new Promise((resolve, reject) => {

            let headerInfo = {
                headers: {
                    Accept: 'application/json',
                    Authorization: 'APIKEY ' + config.threadFixAPIKey,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            request({
                headers: headerInfo.headers,
                url: config.threadFixRESTURL + url,
                method: 'POST',
                json: true,
                body: body,
                rejectUnauthorized: false
            }, function(error, response, body) {
                if (error) {
                    reject(error);
                } else if (!body.success) {
                    reject(body.message);
                } else {
                    resolve(body);
                }
            })

        });
    }

};