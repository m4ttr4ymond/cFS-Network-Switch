const fs = require('fs');
var path = require('path');

const testing = () => {
    let buffer = generateBuffer();

    let id = buffer.readInt16BE(0, 2);
    let date = buffer.readInt32BE(2, 4);
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
    combined = Buffer.alloc(contents.length + 1);
    combined.writeUInt8(header, 0);

    for (let i = 0; i < contents.length; i++) {
        combined.writeUInt8(contents[i], i + 1);
    }

    return combined;
}

const prepend_data = (contents) => {
    var application = "SAMPLE_APP";
    var app_name_len = application.length; // byte
    var entrypoint = "SAMPLE_AppMain";
    var entrypoint_len = entrypoint.length; // byte
    var stacksize = 16384; //uint32
    var priority = 50; // uint16

    combined = Buffer.alloc(contents.length + 8 + app_name_len + entrypoint_len);
    combined.writeUInt8(app_name_len, 0);
    
    for(var i = 0; i < app_name_len; ++i){
        combined.writeUInt8(application.charCodeAt(i), i+1);
    }

    combined.writeUInt8(entrypoint_len, 1 + app_name_len);

    for (var i = 0; i < entrypoint_len; ++i) {
        combined.writeUInt8(entrypoint.charCodeAt(i), i + 2 + app_name_len);
    }

    combined.writeUInt32BE(stacksize, 2 + app_name_len + entrypoint_len);
    combined.writeUInt16BE(priority, 6 + app_name_len + entrypoint_len);

    for (var i = 0; i < contents.length; ++i) {
        combined.writeUInt8(contents[i], i + 8 + app_name_len + entrypoint_len);
    }

    return combined;
}

exports.testing = testing;
exports.extract_data = extract_data;
exports.generateBuffer = generateBuffer;
exports.readFile = readFile;
exports.addIdentifier = addIdentifier;
exports.prepend_data = prepend_data;