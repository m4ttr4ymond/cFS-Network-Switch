const fs = require('fs');
var path = require('path');

const testing = () => {
    let buffer = generateBuffer();
    console.log(buffer);

    let id = buffer.readInt16BE(0, 2);
    let date = buffer.readInt32BE(2, 4);

    console.log(id, date);
}

const extract_data = (buffer) => {
    return {
        date: buffer.readInt32BE(0, 4),
        id: buffer.readInt16BE(4, 2),
        buffer: buffer
    }
}

const generateBuffer = (testingID = 1, testingTimeStamp = Math.floor(Date.now() / 1000), size = 256) => {
    let buffer = Buffer.alloc(256);

    buffer.writeInt16BE(testingID, 0);
    buffer.writeInt32BE(testingTimeStamp, 2);

    for (let i = 6; i < size; i++) {
        buffer.writeUInt8(Math.floor(Math.random() * 256), i);
    }

    return buffer
}

const readFile = (filename, header) => {
    pathname = path.join(__dirname, "../files", filename);
    contents = fs.readFileSync(pathname);
    return addIdentifier(contents, header)
}

const addIdentifier = (contents, header) => {
    combined = Buffer.alloc(contents.length + 3);

    combined.writeUInt8(header, 0);
    combined.writeUInt16(contents.length, 1);

    for (let i = 0; i < contents.length; i++) {
        combined.writeUInt8(contents[i], i + 1);
    }

    return combined;
}

exports.testing = testing;
exports.extract_data = extract_data;
exports.generateBuffer = generateBuffer;
exports.readFile = readFile;
exports.addIdentifier = addIdentifier;