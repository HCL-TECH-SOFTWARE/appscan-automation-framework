const through2 = require('through2');

const EmitterClass = class extends require('events') { };

module.exports = {

    parseCSV: () => {
        let templateKeys = [];
        let parseHeadline = true;
        return through2.obj((data, enc, cb) => {
            if (parseHeadline) {
                templateKeys = [data
                    .toString()];
                parseHeadline = false;
                return cb(null, null)
            }
            const entries = [data
                .toString()];
            const obj = {};
            templateKeys.forEach((el, index) => {
                obj[el] = entries[index]
            });
            return cb(null, obj)
        })
    },

    emitError: err => new EmitterClass().emit('error', err),

    splitWithQuotes: (inArrayStr) => {

        if (inArrayStr.includes('"') || inArrayStr.includes("'")) {
            let outArray = [];
            let elementsInQuotes = [], quoteChar = null;
            inArrayStr.split(',').forEach(d => {
                if (!quoteChar && d.match(/^(['"]).*\1$/g)) {
                    outArray.push(d);
                } else if (!quoteChar && (d.startsWith("'") || d.startsWith('"'))) {
                    elementsInQuotes = [d];
                    quoteChar = d.charAt(0);
                } else if (quoteChar && d.endsWith(quoteChar)) {
                    elementsInQuotes.push(d);
                    outArray.push(elementsInQuotes.join(','));
                    elementsInQuotes = [];
                    quoteChar = null;
                } else if (quoteChar) {
                    elementsInQuotes.push(d);
                } else {
                    outArray.push(d);
                }
            });
            return outArray;
        } else {
            return inArrayStr.split(',');
        }

    }

};