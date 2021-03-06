"use stict";
const PORT = process.env.PORT || 1880;
const BroadlinkServer = require('broadlink-rm-http');
const commands = require('./commands');

const key = "a59dfaf9-430f-4e31-a0e4-6d5ed3d6548f";

var rooms = [];
rooms["livingroom"] = {host:"74:7D:C9:35:04:2E",groups:["ac-set1", "tv"]};
rooms["bedroom"] = {host:"D1:FB:80:28:C2:71",groups:["ac-set1", "light"]};
rooms["bathroom"] = {host:"DE:3B:F5:46:8B:0E",groups:["ac-set2"]};

let app = BroadlinkServer(commands, key, rooms);
    app.listen(PORT);

console.log('Server running, go to http://localhost:' + PORT);