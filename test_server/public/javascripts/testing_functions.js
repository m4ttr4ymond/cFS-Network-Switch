const fs = require('fs');

const testing = () => {
    let buffer = generateBuffer();
    console.log(buffer);

    let id = buffer.readInt16BE(0, 2);
    let date = buffer.readInt32BE(2, 4);

    console.log(id, date);
}

const extract_data = (buffer) => {
    return {
        id: buffer.readInt16BE(0, 2),
        date: buffer.readInt32BE(2, 4),
        buffer: buffer//.slice(5)
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

exports.testing = testing;
exports.extract_data = extract_data;
exports.generateBuffer = generateBuffer;