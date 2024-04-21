const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Routes = require('./Routes');
const axios = require('axios');

dotenv.config();

const cors = require("cors");


const app = express()
app.use(express.json());
app.use(cors());
mongoose.connect(process.env.URI)
    .then(() => {
        console.log("db connected")
        // server will run only when the db is connected properly otherwise not run   
        app.listen(process.env.PORT, () => console.log(`Example app listening on port 3001 `))
    })
    .catch((error) => {
        console.log("error /n", error);
    })

app.get('/', (req, res) => {
    res.send('Hi');
});
app.use('/api',Routes);