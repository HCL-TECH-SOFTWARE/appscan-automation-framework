'use strict';

var logger = require('../../config/logger');
const crypto = require('crypto');
const ENCRYPTION_KEY = 'RKPBA7hoiheq9xOqXSLUeQeJrjweJ1Kn'//config.encryptionKey; // Must be 256 bytes (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

if (!ENCRYPTION_KEY && ENCRYPTION_KEY.length != 31) {
    return logger.error('Error encryption key length is not correct, must be 32 characters.  Please update in src/providers/encrypt.js line 6: ENCRYPTION_KEY');
}

function encrypt(text) {
 let iv = crypto.randomBytes(IV_LENGTH);
 let cipher = crypto.createCipheriv('aes-256-cbc', new Buffer.from(ENCRYPTION_KEY), iv);
 let encrypted = cipher.update(text);

 encrypted = Buffer.concat([encrypted, cipher.final()]);

 return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
 let textParts = text.split(':');
 let iv = new Buffer.from(textParts.shift(), 'hex');
 let encryptedText = new Buffer.from(textParts.join(':'), 'hex');
 let decipher = crypto.createDecipheriv('aes-256-cbc', new Buffer.from(ENCRYPTION_KEY), iv);
 let decrypted = decipher.update(encryptedText);

 decrypted = Buffer.concat([decrypted, decipher.final()]);

 return decrypted.toString();
}

module.exports = { decrypt, encrypt };