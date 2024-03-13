require("dotenv").config({ path: ".env" });

const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqsClient = new SQSClient({ region: "ap-northeast-1" });
const QueueUrl = process.env.SQS01_URL;

async function order(burger, amount) {
    const MessageBody = JSON.stringify({ burger, amount });

    const command = new SendMessageCommand({
        QueueUrl,
        MessageBody,
        MessageGroupId: "test01",
    });

    try {
        const data = await sqsClient.send(command);
        console.log(data);
    } catch (err) {
        console.error(err, err.stack);
    }
}

(async () => {
    await order("cheeseburger", 2);
    await order("hamburger", 1);
})().catch((error) => {
    console.log(error);
});
