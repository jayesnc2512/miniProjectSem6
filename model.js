const mongoose = require("mongoose")

const chatSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique:true
    },
    userStatus: {
        type: String,
    },
    chats: [{
        text: {
            type: String,           
        },
        role: {
            type: String,
        },
        timeStamp:Date
    }],
    
},
);

//create model
const Chats = mongoose.model("Chat", chatSchema)
module.exports = Chats; 