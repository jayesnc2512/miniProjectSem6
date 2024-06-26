const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Chat = require("./model");
var bodyParser = require('body-parser')
const axios = require('axios');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const { measureMemory } = require('vm');

// const express = require('express');
const router = express.Router();

router.post('/send-message', async (req, res) => {
    try {
        let result;
        let { userId, message, status } = req.body;
        if (!userId || !message) {
            res.status(400).json({
                status: 400,
                message: 'Empty Body'
            });
            return;
        }
        if (!status) {
            status = "unknown stage"
        }
        let prevChats;
        const userInfo = await Chat.findOne({ userId });
        //status==moderate anxiety,
        //status==Serious anxiety 
        //status==no  anxiety 
        let last20Chats
        let current_status
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
            current_status = status;
            // userInfo = await Chat.findOne({ userId });
            // console.log("added to db", userInfo)
            prevChats = "null";
            last20Chats = "no chats";
        } else {
            if (status !== "unknown stage") {
                userInfo.chats.push({
                    text: message,
                    role: 'user'
                });
                userInfo.userStatus = status
                current_status = status
                await userInfo.save();
            }
            else {
                userInfo.chats.push({
                    text: message,
                    role: 'user'
                });
                current_status = userInfo.userStatus;
                await userInfo.save();
            }
            // console.log('userInfo', userInfo);

            console.log("db updated")
            prevChats = userInfo.chats;
            last20Chats = prevChats.slice(-20);
        }




        const MetaPrompt = `follow the below points and give equal importance to all the points.
       1)  your name is Mitra.You are psychiatrist and mental health
            expert.Talk to user according to it. do not mention that you're a psychiatrist just pretend like one.
        3) gather its personal information as a friend by friendly. Do not waste time saying I'm here for you and all just get to the point directly. keep it short and simple.
            talking like a one human talk with another human.
        4) tell user who are you in very short.
        5) first develop friend ship with user.develop strong bond
            with user.analyse the prevchats provided and then recognise the stage
            of communication you are there with the user
            and then continue the talk. If you're already befriended in the previous
            chat then try to pickup from where previous chats ended
        6) you are a friend of user and talk about mental health of
            user, in such way that normal friend talking his friend.
        7) In this conversation give every response in context of 
            mental health and try to resolve on yovr own.and make it 
            conversational rather than questions and answers.
        8) Don't tell user you wanted to check iur mental 
            health instead of tell user like "you can share me anything 
            always for you". 
        9) when there is need to give very much large
            response in case  you should summarize it.
        10) use different emojis to express the feelings. 
        11) gather information of user about its mental health by 
            talking with it friendly.
            13) also sometimes not always try to suggest some mindfull activities on our app. like meditation or exercise or listen to amazinf stress relief music which we have in our app.
        12) If user asks the question which not related to mental 
            health and its life, and ask random question.Don't  give 
            the answer to the user, still user asking such question tell 
            user "I am a mitra , I cannot give the answers of such type 
            of  question. NOw the next sentence onwards is your previous chat witht the user
        13) current user status is ${current_status}
        14) incase user status from serious anxiety issue then suggest them to get doctors consults from our app. we can easily
        ask for doctors appointment over email. Also while chat and depending on previous chat if the you think use has serious anxiety issue then suggest doctors consulting through our app, otherwise there's no need to suggest doctors.
        14) Reply should be very short not more than 50 tokens. it should not look like incomplete msg at all"`;

        console.log('sending to openAI');

        const systemMsg = `${MetaPrompt}.previous chats: ${last20Chats}`;
        // console.log('system message', systemMsg)
        const chatToSend = `consider ${systemMsg} first and then reply to ${message}`
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
            "max_tokens": 60
        };
        fetch(process.env.OPENAIURI, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        })
            .then(response => response?.json())
            .then(data => {
                // Assuming data has the structure you expect
                const message = data.choices[0].message.content;

                userInfo.chats.push({
                    text: message,
                    userStatus: status,
                    role: 'Mitra'
                });
                userInfo.save();
                res.status(200).json({ chatBack: message });
            })
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
        if (!userId) {
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

router.post('/get-user-status', async (req, res) => {
    try {
        let result;
        const { userId } = req.body;
        if (!userId) {
            res.status(400).json({
                status: 400,
                message: 'Empty Body'
            });
            return;
        }

        let status;
        const userInfo = await Chat.findOne({ userId });
        status = userInfo.userStatus;
        res.status(200).json(status);
    } catch (err) {
        console.log("error in getAllChats");
    }
});

router.post('/generate-report', async (req, res) => {
    try {
        let { userId, userStatus, name,email } = req.body;
        if (!userId ) {
            res.status(400).json({
                status: 400,
                message: "details not sent"
            })
        }
        const userInfo = await Chat.findOne({ userId });
        let status;
        if (!userStatus) {
            userStatus = await userInfo.userStatus;
        }
        if (!userStatus) {
            userStatus = 'Unknown'
        }
        prevChats = await userInfo.chats;
        last50Chats = prevChats.slice(-50);
        if (!userInfo || !userInfo.chats || prevChats.length < 20) {
            userStatus = 'new user';
        }

        console.log("userStatus", userStatus);
        console.log("userId", userId);
        let promptForReport = `
            1)"Provide a concise summary of the entire conversation in 150 words."
            2)"Identify the specific mental health condition the user might be suffering from based on the chat."
            3)"Describe how the identified condition is evident in the conversation by highlighting key indicators, patterns, or phrases."
            4)"Mention any specific behaviors or expressions of distress noted during the interaction."
            5)"Highlight significant insights or moments in the chat that provide a deeper understanding of the user's mental state."
            6)the user mental anxiety level is given. if it is  'new use' you should not give an conclusive report. your report shall say that the user is relatively new to our platform so we can provide an conclcusive judgement.
            7) at the top make bullet point telling the user mental status. this is mental axiety level status of the user-${userStatus}.
            8) The previuos chats are given below
            ${last50Chats}.
            9) in these chats the role user show mesaages by user and Mitra shows messages by our system.
            10) Name of the User is ${name}.
        `


        console.log('sending to openAI');

        // console.log('system message', systemMsg)
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAIKEY}`
        };
        const requestBody = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {
                    "role": "user",
                    "content": promptForReport
                }
            ],
        };
        let reportContent=''
        await fetch(process.env.OPENAIURI, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        })
            .then(response => response?.json())
            .then(data => {
                // Assuming data has the structure you expect
                 reportContent = data.choices[0].message.content;

            })
            .catch(error => console.error('Error:', error));
        

        const pdfDoc = await PDFDocument.create();
        let outputPath=`${userId}.pdf`
        // Add a blank page to the document
        const page = pdfDoc.addPage();

        // Define the font size and color
        const fontSize =14;
        const color = rgb(0, 0, 0);
        console.log("reportContent", reportContent);
        // Draw the text on the page
        await page.drawText(reportContent, {
            x: 50,
            y: page.getHeight() - 4 * fontSize,
            size: fontSize,
            color: color,
            maxWidth: page.getWidth() - 2 * 50,

        });

        // Serialize the PDFDocument to bytes
        const pdfBytes = await pdfDoc.save();

        // Write the PDF to a file
        fs.writeFileSync(outputPath, pdfBytes);
        console.log(`PDF saved to ${outputPath}`);
        res.status(200).json({message:"Report generated"});

    } catch (err) {
        console.log("error in generate-report", err);
        res.status(500);
    }
})





module.exports = router;
