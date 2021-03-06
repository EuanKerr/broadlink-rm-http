"use strict";

/* Modules */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const macRegExp = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

/* Setup */
const Broadlink = require('./device');

function sendData(device = false, hexData = false) {
    if(device === false || hexData === false) {
        console.log('Missing params, sendData failed', typeof device, typeof hexData);
        return;
    }

    const hexDataBuffer = new Buffer(hexData, 'hex');
    device.sendData(hexDataBuffer);
}

module.exports = (commands, key, rooms) => {
    /* Server */
    let app = express();

    app.use(helmet());
    app.use(cors());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    (app.get('/learn/:key/:host', (req, res) => {
		
		if (req.params.key == key) {
			
        let host = req.params.host.toLowerCase();
        let device = Broadlink({ host, learnOnly: true });
        if(device) {
            if (!device.enterLearning) return res.json({error: `Learn Code (IR learning not supported for device at ${host})`});
            if (!device.enterLearning && !device.enterRFSweep) return res.json({error:`Scan RF (RF learning not supported for device at ${host})`});

            (device.cancelRFSweep && device.cancelRFSweep());

            let cancelLearning = () => {
                (device.cancelRFSweep && device.cancelRFSweep());
                device.removeListener('rawData', onRawData);

                clearTimeout(getTimeout);
                clearTimeout(getDataTimeout);
            };

            let getTimeout = setTimeout(() => {
                cancelLearning();
                res.json({error: 'Timeout.'});
            }, 20000);

            let getDataTimeout = setTimeout(() => {
                getData(device);
            }, 1000);

            const getData = (device) => {
                if (getDataTimeout) clearTimeout(getDataTimeout);
              
                device.checkData()
              
                getDataTimeout = setTimeout(() => {
                  getData(device);
                }, 1000);
            }

            let onRawData = (message) => {
                cancelLearning();

                return res.json({
                    command: "command_name",
                    group: "group_id",
                    data: message.toString('hex')
                });
            };

            device.on('rawData', onRawData);

            // Start learning:
            (device.enterLearning ? device.enterLearning() : device.enterRFSweep());
        } else {
            res.json({error: `Device ${host} not found`});
        }
		
		} else {
			res.json({error: `Key not found: ${req.params.key}`});
		}
	   
    }));

    app.get('/execute/:key/:room/:name', (req, res) => {
	
	   if (req.params.key == key) {
		   
		 if (rooms[req.params.room]) {
			 
		 const command = commands.find(o => o.command === req.params.name && rooms[req.params.room]["groups"].indexOf(o.group) > -1);
		
         if (command) {
			
			let host = rooms[req.params.room]["host"].toLowerCase();
            let device = Broadlink({ host });

            if (!device) {
                console.log(`Error while performing command "${req.params.name}": No device found at ${host}`);
				return res.sendStatus(404);
            } else if (!device.sendData) {
                console.log(`Error while performing command "${req.params.name}": The device at ${host} doesn't support sending IR or RF codes`);
            } else if (command.data && command.data.includes('5aa5aa555')) {
				console.log(`Error while performing command "${req.params.name}": Outdated code type, please use the Learn utility to get a new code`);
            } else {
                if('sequence' in command) {
                    console.log('Sending sequence..');
                    for(var i in command.sequence) {
                        let find = command.sequence[i];
                        let send = commands.find((e) => { return e.command == find; });
                        if(send) {
                            setTimeout(() => {
                                console.log(`Sending command ${send.command}`)
                                sendData(device, send.data);
                            }, 1000 * i);
                        } else {
                            console.log(`Sequence command ${find} not found`);
                        }
                    }
                } else {
                    sendData(device, command.data);
                }

                return res.sendStatus(200);
            }

            res.sendStatus(501);
			
         } else {
             console.log(`Command not found: ${req.params.name}`);
             res.sendStatus(404);
         }
			
         } else {
             console.log(`Room not found: ${req.params.room}`);
             res.sendStatus(404);
         }
	    
	   } else {
	       console.log(`Key not found: ${req.params.key}`);
           res.sendStatus(403);
       }
		
    });

    return app;

}