const cron = require('node-cron');
const axios = require('axios');
const Reddit = require('reddit');
const fs = require('fs');

var data = fs.readFileSync('data.csv')
    .toString() // convert Buffer to string
    .split('\n') // split string to lines
    .map(e => e.trim()) // remove white spaces for each line
    .map(e => e.split(',').map(e => e.trim())); // split each line to array


let credentialData = fs.readFileSync('credentials.json');
let credentials = JSON.parse(credentialData);
const reddit = new Reddit({
    username: credentials.username,
    password: credentials.password,
    appId: credentials.appId,
    appSecret: credentials.appSecret,
    userAgent: credentials.userAgent
  })


  async function redditPost(state, details, status) {
    let postText = "EMPTY";
    if(status == "enter"){
        console.log(details);
            if(state[1] != ''){
                if(details[5] != '""'){
                    postTitle = "Aircraft callsign " + state[1] + " has entered Halifax airspace - "+ details[13].replace(/['"]+/g, '') + " " +details[4].replace(/['"]+/g, '') + "." ;
                }
                else{
                    postTitle = "Aircraft callsign " + state[1] + " has entered Halifax airspace."
                }

                if(details[14] != '""'){
                    let airline = details[14].replace(/['"]+/g, '');
                }

                postText  = "Aircraft callsign " + state[1] + "- "+ details[13].replace(/['"]+/g, '') + " " +details[4].replace(/['"]+/g, '')  + " has entered Halifax airspace."
                            +"\n"
                            +"\n"
                            +"Altitude: " + Math.trunc(state[13]) +"m"
                            +"\n"
                            +"\n"
                            +"Velocity: " + Math.trunc(state[9]*3.6) +"km/h"
                            +"\n"
                            +"\n"
                            +"[OpenSky Database entry for this aircraft](https://opensky-network.org/aircraft-profile?icao24="+state[0]+")"
                            +"\n"
                            +"\n"
                            +"[ADS-B Exchange link for this aircraft](https://globe.adsbexchange.com/?icao="+state[0]+")"
                            +"\n"
                            +"\n"
                            +"Data via the [OpenSky API](https://openskynetwork.github.io/opensky-api/)"
                            +"\n"
                            +"\n"
                            +"I am a bot. Bleep. Bloop. /u/Democedes is my creator"
                        }
            else{
                postTitle = "Aircraft with unknown callsign (icao24 transponder code: " + state[0] + ") has entered Halifax airspace."
                postText =  "Aircraft with unknown callsign (icao24 transponder code: " + state[0] + ") has entered Halifax airspace."
                            +"\n"
                            +"\n"
                            +"Altitude: " + Math.trunc(state[13]) +"m"
                            +"\n"
                            +"\n"
                            +"Velocity: " + Math.trunc(state[9]*3.6) +"km/h"
                            +"\n"
                            +"\n"
                            +"[OpenSky Database entry for this aircraft](https://opensky-network.org/aircraft-profile?icao24="+state[0]+")"
                            +"\n"
                            +"\n"
                            +"[ADS-B Exchange link for this aircraft](https://globe.adsbexchange.com/?icao="+state[0]+")"
                            +"\n"
                            +"\n"
                            +"Post Data via the [OpenSky API](https://openskynetwork.github.io/opensky-api/)"
                            +"\n"
                            +"\n"
                            +"I am a bot. Bleep. Bloop. /u/Democedes is my creator"
            }
    }
    if(status == "exit"){
        postText = "Aircraft callsign " + state[1]  + " has left Halifax airspace."
    }
    const res = await reddit.post('/api/submit', {
        sr: 'HalifaxSkyWatchers',
        kind: 'self',
        resubmit: true,
        title: postTitle,
        text: postText
      })
      console.log(res)
  }

let aircrafts = [];
let recents = [];

cron.schedule('*/30 * * * * *', () => {
    axios
    .get('https://opensky-network.org/api/states/all?lamin=44.00&&lomin=-64.00&lamax=45.00&lomax=-63.00')
    .then(res => {
            if(!res.data.states){
                console.log("No aircraft overhead");
            }
            else{
                for(let state of res.data.states){
                    let newAircraft = true;
                    for(let aircraft of aircrafts){
                        if(aircraft[0] == state[0]){
                            newAircraft = false;
                        }
                    }
                    if(newAircraft){
                         console.log("ICAO " + state[0] + " has entered Halifax airspace.");

                        aircrafts.push(state);

                        let newRecent = true;
                        for(let recent of recents){
                            if(recent[0] == state[0]){
                                newRecent = false;
                            }
                        }
                        if(newRecent){
                            for(aircraft of data){
                                if(aircraft[0].replace(/['"]+/g, '') == state[0]){
                                    console.log("match");
                                    redditPost(state, aircraft, "enter")
                                }
                            }
                            recents.push(state)
                            recents[recents.length - 1].date = Date.now();
                        }
                        else{
                            console.log("Known Aircraft")
                        }
                        for(let i = 0; i < recents.length; i ++){
                            if(Date.now() - recents[i].date > 1000 * 60 * 60){
                                recents.splice(i);
                            }
                        }
                    }
                }

                for(let i = 0; i < aircrafts.length; i++){
                    let aircraft = aircrafts[i];
                    let removeAircraft = true;
                    for(let state of res.data.states){
                        if(aircraft[0] == state[0]){
                            removeAircraft = false;
                        }
                    }
                    if(removeAircraft){
                        console.log("ICAO " + aircrafts[i][0] + " has left Halifax airspace.");
                        aircrafts.splice(i);
                    }
                }
            }
        })
        .catch(error => {
            console.error(error)
        })

});