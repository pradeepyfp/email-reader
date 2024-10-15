const xlsx = require("xlsx");
const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");

const workbook = xlsx.readFile("emails.xlsx");
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const emailCredentials = xlsx.utils.sheet_to_json(worksheet);

async function readEmailsFromImap(email, password) {
  const config = {
    imap: {
      user: email,
      password: password,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      authTimeout: 3000,
      tlsOptions: { rejectUnauthorized: false },
    },
  };

  try {
    console.log(`Processing email: ${email}`);
    console.log(`Connecting to IMAP for ${email}...`);
    const connection = await imaps.connect(config);
    console.log("Connected successfully!");

    const boxes = await connection.getBoxes();
    console.log("Available Mailboxes:", Object.keys(boxes));

    await connection.openBox("INBOX");
    console.log("Opened INBOX.");

    const searchCriteria = ["ALL"];

    const fetchOptions = {
      bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
      markSeen: false,
      struct: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`Found ${messages.length} messages in INBOX.`);

    messages.forEach((message, index) => {
      console.log(`Message ${index + 1}:`, message);
    });

    if (messages.length === 0) {
      console.log("No messages found in INBOX.");
    } else {
      for (let i = 0; i < Math.min(2, messages.length); i++) {
        const message = messages[i];
        const header = message.parts.find(
          (part) => part.which === "HEADER.FIELDS (FROM TO SUBJECT DATE)"
        );
        const textPart = message.parts.find((part) => part.which === "TEXT");

        console.log(`--- Email ${i + 1} ---`);
        if (header) {
          console.log("Subject:", header.body.subject ? header.body.subject[0] : "No Subject");
          console.log("From:", header.body.from ? header.body.from[0] : "No Sender");
        }

        if (textPart) {
          console.log("Body:", textPart.body);
        }
      }
    }

    connection.end();
    console.log(`Finished reading emails for ${email}`);
  } catch (error) {
    console.error("Error reading emails:", error);
  }
}

(async () => {
  for (const { email, password } of emailCredentials) {
    await readEmailsFromImap(email, password);
  }
})();


// const express = require("express");
// const xlsx = require("xlsx");
// const imaps = require("imap-simple");

// const app = express();
// const PORT = 3000;

// const workbook = xlsx.readFile("emails.xlsx");
// const sheetName = workbook.SheetNames[0];
// const worksheet = workbook.Sheets[sheetName];
// const emailCredentials = xlsx.utils.sheet_to_json(worksheet);

// async function readEmailsFromImap(email, password) {
//   const config = {
//     imap: {
//       user: email,
//       password: password,
//       host: "imap.gmail.com",
//       port: 993,
//       tls: true,
//       authTimeout: 3000,
//       tlsOptions: { rejectUnauthorized: false },
//     },
//   };

//   console.log(`Connecting to IMAP for ${email}...`);
//   const connection = await imaps.connect(config);
//   console.log("Connected successfully!");

//   await connection.openBox("INBOX");
//   console.log("Opened INBOX.");

//   const searchCriteria = ["UNSEEN"];
//   const fetchOptions = {
//     bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
//     markSeen: false,
//   };

//   console.log("Executing search for emails...");
//   try {
//     const messages = await connection.search(searchCriteria, fetchOptions);
//     console.log(`Found ${messages.length} messages.`);

//     const emails = [];

//     if (messages.length === 0) {
//       console.log("No messages found.");
//     } else {
//       messages.slice(0, 2).forEach((message, index) => {
//         const header = message.parts.find(
//           (part) => part.which === "HEADER.FIELDS (FROM TO SUBJECT DATE)"
//         );
//         const textPart = message.parts.find((part) => part.which === "TEXT");

//         console.log(`--- Email ${index + 1} ---`);
//         const emailData = {
//           subject: header.body.subject ? header.body.subject[0] : "No Subject",
//           from: header.body.from ? header.body.from[0] : "No Sender",
//           body: textPart ? textPart.body : "No body found",
//         };
//         console.log(emailData);
//         emails.push(emailData);
//       });
//     }

//     return emails;
//   } catch (error) {
//     console.error("Error during search:", error);
//     throw error;
//   } finally {
//     await connection.end();
//     console.log(`Finished reading emails for ${email}`);
//   }
// }
// app.get("/fetch-emails", async (req, res) => {
//   const { email, password } = req.query;

//   console.log(`Fetching emails for ${email}`);
//   try {
//     const messages = await readEmailsFromImap(email, password);
//     res.json(messages);
//   } catch (error) {
//     console.error("Error fetching emails:", error);
//     res.status(500).json({ error: "Error fetching emails" });
//   }
// });
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
