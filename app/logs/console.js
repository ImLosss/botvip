const fs = require('fs');
const moment = require('moment-timezone');
const lockfile = require('proper-lockfile');
const { getLocation } = require('../function/utils');


async function error(errorMsg) {
    try {
        // Tentukan zona waktu Makassar
        const time = getTime();
        const file = getLocation();

        console.log(`[${ time } / error] ${ errorMsg.message? errorMsg.message : errorMsg }`);

        let errorData = readJSONFileSync('app/logs/error.json')

        const data = {
            type: 'Error',
            date: time,
            errorLocation: file,
            errorMessage: errorMsg.message? errorMsg.message : errorMsg,
            error: errorMsg instanceof Error ? `${errorMsg.message}\n${errorMsg.stack}` : errorMsg
        }

        errorData.push(data);

        if(errorData.length > 50) errorData.splice(0, 1);

        writeJSONFileSync('app/logs/error.json', errorData);
    } catch (error) {
        console.log(error);
        console.log('error saat menulis log: ', error.message);
    }
}

async function log(log, type = 'info') {
    try {
        // Tentukan zona waktu Makassar
        const file = getLocation();

        const time = getTime();
        if(typeof(log) == 'object') log = JSON.stringify(log);
        console.log(`[${ time } / ${ type }] ${ log }`);

        let logData = readJSONFileSync(`app/logs/log.json`);
         
        const data = {
            type: type,
            date: time,
            location: file,
            message: log
        }

        logData.push(data);

        if(logData.length > 500) logData.splice(0, 1);

        writeJSONFileSync('app/logs/log.json', logData);
    } catch (error) {
        console.log('error saat menulis log: ', error.message);
    }
}

function getTime() {
    // Tentukan zona waktu Makassar
    const time = moment().tz('Asia/Makassar');

    // Ambil tanggal, jam, dan menit
    const tanggal = time.format('YYYY-MM-DD');
    const jam = time.format('HH');
    const menit = time.format('mm');

    return `${ tanggal } / ${ jam }:${ menit }`;
}

function readJSONFileSync(filePath) {
    let release;
    try {
        // Lock the file for reading
        release = lockfile.lockSync(filePath);
        
        let fileContent = fs.readFileSync(filePath, 'utf-8');

        if(fileContent == '') fileContent = [];
        else fileContent = JSON.parse(fileContent);

        return fileContent;
    } catch (error) {
        return [];
    } finally {
        if (release) {
            release();
        }
    }
}

function writeJSONFileSync(filePath, data) {
    let release;
    try {
        // Lock the file for writing
        release = lockfile.lockSync(filePath);
        
        const jsonData = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, jsonData, 'utf-8');
    } catch (error) {
        console.error('Error writing file:', error);
    } finally {
        if (release) {
            release();
        }
    }
}

module.exports = {
    log, error
}