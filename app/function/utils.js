const path = require('path');
const fs = require('fs');
const lockfile = require('proper-lockfile');
const moment = require('moment-timezone');

function getLocation() {
    const error = new Error();
    const stack = error?.stack?.split('\n') || null;

    if (stack == null) return null;

    const projectRoot = getProjectRoot(__dirname);

    // Mulai dari elemen ke-2 untuk melewati baris pertama yang merupakan lokasi Error dibuat
    for (let i = 3; i < stack.length; i++) {
        const callerLine = stack[i];
        const filePathMatch = callerLine.match(/\((.*):\d+:\d+\)/) || callerLine.match(/at (.*):\d+:\d+/);
        
        if (filePathMatch) {
            const fullPath = filePathMatch[0];
            if (fullPath && fullPath.includes(projectRoot) && !fullPath.includes('node:internal/modules') && !fullPath.includes('service/utils.js') && !fullPath.includes('service/utils.js')) {
                
                let fileName = path.basename(fullPath); 
                fileName = fileName.replace(/[()]/g, '');

                return fileName;
            }
        }
    }
    return null;
}

function removeFromArray(arr, value) {
    if (value == 'reset') {
        arr.splice(0, arr.length); // Hapus semua elemen dari array
        return 'Berhasil reset data';
    } else {
        const index = arr.indexOf(value);
        if (index !== -1) {
            arr.splice(index, 1);
            return `Berhasil menghapus *${value}*`;
        } else {
            return 'Data tidak ditemukan';
        }
    }
}

function isJSON(str) {
    return typeof str === 'string' && /^[\],:{}\s]*$/.test(str.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''));
}

function getProjectRoot(dir) {

    while (dir !== path.parse(dir).root) {
        if (fs.existsSync(path.join(dir, 'package.json'))) {
            return path.basename(dir);
        }
        dir = path.dirname(dir);
    }

    return 'not found';
}

function deleteFile(dir) {
    fs.unlink(dir, err => {
        if (err) {
            return;
        }
    });
}

function writeJSONFileSync(filePath, data) {
    let release;
    try {
        // Pastikan direktori ada sebelum menulis file
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            console.log('tess');
            fs.mkdirSync(dirPath, { recursive: true });
        }

         // Pastikan file ada sebelum mengunci
         if (!fs.existsSync(filePath)) {
            console.log('Membuat file:', filePath);
            fs.writeFileSync(filePath, '{}', 'utf-8'); // Buat file kosong agar bisa dikunci
        }

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

function readJSONFileSync(filePath) {
    let release;
    try {
        // Lock the file for reading
        release = lockfile.lockSync(filePath);
        
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        return JSON.parse(fileContent);
    } catch (error) {
        console.error('error');
        console.log(error);
    } finally {
        if (release) {
            release();
        }
    }
}

function cutVal(value, index) {
    const words = value.split(' '); // Pisahkan kalimat menjadi array kata-kata
    return words.slice(index).join(' '); // Gabungkan kembali kata-kata dari indeks yang ditentukan
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

const withErrorHandling = (fn) => {
    return async (...args) => {
        try {
            await fn(...args);
        } catch (err) {
            console.error(err);
        }
    };
};

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

module.exports = {
    getLocation, deleteFile, removeFromArray, readJSONFileSync, writeJSONFileSync, cutVal, withErrorHandling, isJSON, getTime, sleep
};