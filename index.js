require('dotenv').config()

const { App } = require("@slack/bolt");
let axios = require('axios');

const app = new App({
    token: process.env.BOT_TOKEN_SLACK,
    signingSecret: process.env.SIGN_IN_SECRET_SLACK
});

/// leave comment on JIRA
async function leaveComment(taskId, text){
    const data = JSON.stringify({
        "body": {
          "type": "doc",
          "version": 1,
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "text": `${text}`,
                  "type": "text"
                }
              ]
            }
          ]
        }
      });
      
    const config = {
        method: 'post',
        url: `${process.env.URL_JIRA}/rest/api/3/issue/${taskId}/comment`,
        headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.EMAIL_JIRA}:${process.env.API_TOKEN_JIRA}`).toString('base64')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        data : data
    };
      
    await axios(config)
    .catch(function (error) {
            switch (error.response.status) {
                case 404:
                    throw new Error(`Task with id "${taskId}" not found`)
                case 401:
                    throw new Error('Jira authentication credentials are incorrect.')        
                default:
                    throw new Error('Some error occured.')
            }
        });
}

// Slack message listener
app.message(async ({ message, say }) => {
    // get all task ids from message
    let messageArray = message.text.match(/\b[A-Z][A-Z0-9_]+-[1-9][0-9]*/gm);
    if(messageArray){
        messageArray.map(async (id) =>{
            try {            
                // leaving comment on Jira
                await leaveComment(id, message.text)
            } catch (e) {
                // sending message back to Slack in case of error with specific error message
                await say(e.message)
            }
        })
    } else{
        // sending message back to Slack if no ids where found in message
        await say(`TaskId is required to leave a comment on Jira`)
    }
});

(async () => {
    await app.start(process.env.PORT || 5000);
    console.log('Bot is running!');
    console.log(`Your request URL for Slack settings is: https://lt-for-testing-purposes-qwerty.loca.lt/slack/events`)
  })();