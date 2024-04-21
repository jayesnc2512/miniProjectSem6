const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Chat = require("./model");
var bodyParser = require('body-parser')
const axios = require('axios');
// const express = require('express');
const router = express.Router();

router.post('/send-message', async (req, res) => {
    try {
        let result;
        const { userId, message, status } = req.body;
        if (!userId || !message) {
            res.status(400).json({
                status: 400,
                message: 'Empty Body'
            });
            return;
        }

        let prevChats;
        const userInfo = await Chat.findOne({ userId });
        //status==moderate anxiety issue,
        //status==Serious anxiety issue
        //status==no  anxiety issue
        if (!userInfo) {
            const newUser = new Chat({
                userId: userId,
                userStatus: status,
                chats: [{
                    text: message,
                    role: 'user'
                }]
            });
            await newUser.save();
            userInfo = await Chat.findOne({ userId });
            console.log("added to db", userInfo)
        } else {
            userInfo.chats.push({
                text: message,
                userStatus: status,
                role: 'user'
            });
            await userInfo.save();
            console.log('userInfo', userInfo);

            console.log("db updated")
        }
        prevChats = userInfo.chats;
        const last20Chats = prevChats.slice(-20);

        

        const MetaPrompt = `follow the below points and give equal importance to all the points.
       1)  your name is Mitra.You are psychiatrist and mental health
            expert.Talk to user according to it. 
        3) gather its personal information as a friend by friendly 
            talking like a one human talk with another human.
        4) tell user who are you in very short.
        5) first develop friend ship with user.develop strong bond
            with user.analyse the prevchats provided and then recognise the stage of communication you are there with the user
            and then continue the talk. If you're already befriended in the previous
            chat then try to pickup from where previous chats ended
        6) you are a friend of user and talk about mental health of
            user, in such way that normal friend talking his friend.
        7) In this conversation give every response in context of 
            mental health and try to resolve.and make it 
            conversational rather than questions and answers.
        8) Don't tell user you wanted to check in on your mental 
            health instead of tell user like "you can share me anything 
            always for you". 
        9) when there is need to give very much large
            response in case  you should summarize it.
        10) use different emojis to express the feelings. 
        11) gather information of user about its mental health by 
            talking with it friendly.
        12) If user asks the question which not related to mental 
            health and its life, and ask random question.Don't  give 
            the answer to the user, still user asking such question tell 
            user "I am a mitra , I cannot give the answers of such type 
            of  question. NOw the next sentence onwards is your previous chat witht the user
        13) Reply should be very short not more than 40 tokens"`;

        console.log('sending to openAI');

        const systemMsg = `${MetaPrompt}.previous chats: ${last20Chats}`;
        console.log('system message', systemMsg)
        const chatToSend=`consider ${systemMsg} first and then reply to ${message}`
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAIKEY}`
        };
        const requestBody = {
            "model": "gpt-3.5-turbo",
            "messages": [
                // {
                //     "role": "system",
                //     "content": systemMsg
                // },
                {
                    "role": "user",
                    "content": chatToSend
                }
            ],
            "max_tokens": 50
        };
        fetch(process.env.OPENAIURI, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        })
            .then(response => response?.json())
            .then(data => res.status(200).json(data.choices[0].message.content))
            .catch(error => console.error('Error:', error));
        
    } catch (err) {
        res.status(500).send({ message: err });
        console.log("error in send-message route", err);
    }
});

    router.post('/getAllChats', async (req, res) => {
        try {
            let result;
            const { userId } = req.body;
            if (!userId ) {
                res.status(400).json({
                    status: 400,
                    message: 'Empty Body'
                });
                return;
            }

            let prevChats;
            const userInfo = await Chat.findOne({ userId });
            prevChats = userInfo.chats;
            res.status(200).json(prevChats);
        } catch (err) {
            console.log("error in getAllChats");
        }
            
});





module.exports = router;
