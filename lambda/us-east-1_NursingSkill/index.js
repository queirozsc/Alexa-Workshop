// Created at Oktober Cloud workshop
// Source: https://github.com/InternetOfHealthcare/aws-nursingskill

'use strict';

/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const https = require('https');
const uuid = require('uuid');
const iotData = new AWS.IotData({ endpoint: "a2enzbgohiblz2.iot.us-east-1.amazonaws.com" });

var pname,psis, pdia;



// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to the Alexa Nursing Skill by Sergio. ' +
        'Please tell me your name';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Please tell me your name';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for using the Alexa Nursing Skill. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function createFavoriteColorAttributes(favoriteColor) {
    return {
        favoriteColor,
    };
}

function createNameAttributes(patientName) {
    return {
        patientName,
    };
}
function createDiastolicAttributes(diastolicPressure) {
    return {
        diastolicPressure,
    };
}
function createSistolicAttributes(sistolicPressure) {
    return {
        sistolicPressure,
    };
}

function setNameInSession(intent, session, callback) {
    const cardTitle = intent.name;
    const strName = intent.slots.strname;
    pname=strName.value;
    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';

    if (strName) {
        const nameValue = strName.value;
        sessionAttributes = createNameAttributes(nameValue);
        speechOutput = `Welcome ${nameValue}. You can ask me ` +
            "things about your health!";
        repromptText = "You can ask me things about your health";
    } else {
        speechOutput = "I'm not sure who you are. Please try again saying your name.";
        repromptText = speechOutput;
    }

    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function bloodpressure(intent, session, callback) {
    const cardTitle = intent.name;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';

    speechOutput = `What is your sistolic pressure ${session.attributes.patientName}? `; 
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
}

function measureBloodPressure(intent, session, callback) {
    const cardTitle = intent.name;
    let sessionAttributes = session.attributes;
    var params = {
      topic: 'healthcare/bloodpressure',
      payload: '{ "on" : true}'
    }
    let speechOutput = "Starting blood pressure device";
    iotData.publish(params, (err, res) => {
      if (err) return context.fail(err);
      //return context.succeed();

    });
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, true));

};

function bloodpressureDiastolic(intent, session, callback) {
    const cardTitle = intent.name;
    const diastolic = intent.slots.diastolic;
    let speechOutput = '';
    let sessionAttributes = session.attributes;

    if (diastolic) {
        const dValue = diastolic.value;
        pdia=dValue;
        sessionAttributes += createDiastolicAttributes(dValue);
        speechOutput = `Thanks ${pname} your blood pressure data will be stored. `; 
        newPatient(callback);

    } else {
        speechOutput = `What is your sistolic pressure ${pname}? `; 

    }
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, true));
}

function newPatient(callback) {
    var params = {
        Item : {
            "id" : uuid.v1(),
            "name" : pname,
            "sistolic" : psis,
            "diastolic" : pdia,
            "time_stamp" : new Date()
        },
        TableName : "healthdata"
    };
    dynamoDB.put(params, function(err, data){
        callback(err, data);
    });
}
function bloodpressureSistolic(intent, session, callback) {
    const cardTitle = intent.name;
    const sistolic = intent.slots.sistolic;
    let speechOutput = '';
    let sessionAttributes = session.attributes;

    if (sistolic) {
        const sValue = sistolic.value;
        psis = sValue;
        sessionAttributes += createSistolicAttributes(sValue);
        speechOutput = `What is your diastolic pressure ${pname}? `; 

    } else {
        speechOutput = `What is your sistolic pressure ${pname}? `; 

    }
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, false));
}

function bestSoccerTeam(intent, session, callback) {
    const cardTitle = intent.name;
    const state = intent.slots.state;
    let speechOutput = '';
    let sessionAttributes = session.attributes;

    if (state) {
        const sValue = state.value;
        sessionAttributes += sValue;
        speechOutput = `${pname}, the best team at ${sValue} is Vasco da Gama! `; 

    } else {
        speechOutput = `What is your current state, ${pname}? `; 

    }
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, false));
}


function getNameFromSession(intent, session, callback) {
    let patientName;
    const repromptText = null;
    const sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = '';

    if (session.attributes) {
        patientName = session.attributes.patientName;
    }

    if (patientName) {
        speechOutput = `Your name is ${patientName}.`;
        shouldEndSession = false;
    } else {
        speechOutput = "I'm not sure who you are";
    }

    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

/**
 * Sets the color in the session and prepares the speech to reply to the user.
 */
function setColorInSession(intent, session, callback) {
    const cardTitle = intent.name;
    const favoriteColorSlot = intent.slots.Color;
    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';

    if (favoriteColorSlot) {
        const favoriteColor = favoriteColorSlot.value;
        sessionAttributes = createFavoriteColorAttributes(favoriteColor);
        speechOutput = `I now know your favorite color is ${favoriteColor}. You can ask me ` +
            "your favorite color by saying, what's my favorite color?";
        repromptText = "You can ask me your favorite color by saying, what's my favorite color?";
    } else {
        speechOutput = "I'm not sure what your favorite color is. Please try again.";
        repromptText = "I'm not sure what your favorite color is. You can tell me your " +
            'favorite color by saying, my favorite color is red';
    }

    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getColorFromSession(intent, session, callback) {
    let favoriteColor;
    const repromptText = null;
    const sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = '';

    if (session.attributes) {
        favoriteColor = session.attributes.favoriteColor;
    }

    if (favoriteColor) {
        speechOutput = `Your favorite color is ${favoriteColor}. Goodbye.`;
        shouldEndSession = true;
    } else {
        speechOutput = "I'm not sure what your favorite color is, you can say, my favorite color " +
            ' is red';
    }

    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}


// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'MyColorIsIntent') {
        setColorInSession(intent, session, callback);
    } else if (intentName === 'MyNameIs') {
        setNameInSession(intent, session, callback);
    } else if (intentName === 'MyBloodPressureIntent') {
        bloodpressure(intent, session, callback);
    } else if (intentName === 'SistolicIntent') {
        bloodpressureSistolic(intent, session, callback);
    } else if (intentName === 'DiastolicIntent') {
        bloodpressureDiastolic(intent, session, callback);
    } else if (intentName === 'MyWeightIsIntent') {
        setNameInSession(intent, session, callback);
    } else if (intentName === 'MyNameIs') {
        setNameInSession(intent, session, callback);
    } else if (intentName === 'WhatsMyColorIntent') {
        getColorFromSession(intent, session, callback);
    } else if (intentName === 'WhatsMyNameIntent') {
        getNameFromSession(intent, session, callback);
    } else if (intentName === 'MeasureBloodPressure') {
        measureBloodPressure(intent, session, callback);
    } else if (intentName === 'BestSoccerTeamIntent') {
        bestSoccerTeam(intent, session, callback);        
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};

function avg(callback) {
    var table = "patient";
    var name = "Larry";
    var params = {
        TableName: table,
        Key:{
            "name": name
        }
    };
    dynamoDB.scan(params, function(err, data) {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            callback(err);
        } else {
            var totalElements = data.Items.length;
            var diastolicAvg=0, sistolicAvg=0;
            
            for(var x=0;x<data.Items.length;x++) {
                diastolicAvg += parseInt(data.Items[x].diastolic,10);
                sistolicAvg += parseInt(data.Items[x].sistolic,10);
            }
            diastolicAvg/=totalElements;
            sistolicAvg/=totalElements;
            
            callback(null, "Sistolic " + Math.floor(sistolicAvg) + " Diastolic " + Math.floor(diastolicAvg));
        }
    });
}