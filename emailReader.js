let Imap = require("node-imap");
let inspect = require("util").inspect;
const { Buffer } = require("buffer");
const htmlToText = require("html-to-text");
const quotedPrintable = require("quoted-printable");
require("dotenv").config();

let imap = new Imap({
  user: process.env.EMAIL,
  password: process.env.PASSWORD,
  host: "imap.gmail.com",
  port: 993,
  tls: true,
});

function openInbox() {
  return new Promise((resolve, reject) => {
    imap.openBox("INBOX", true, (err, box) => {
      if (err) reject(err);
      else resolve(box);
    });
  });
}

function isPrintable(str) {
  return /^[\x20-\x7E\s]*$/.test(str);
}

function extractImageUrls(html) {
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  let images = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1]); // Extract and store the URL of the image
  }
  return images;
}

async function fetchEmails() {
  try {
    await imapConnect(); // Ensure connection to IMAP
    const box = await openInbox();
    const f = imap.seq.fetch(
      `${box.messages.total - 6}:${box.messages.total}`,
      {
        bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "1"],
        struct: true,
      }
    );

    f.on("message", (msg, seqno) => {
      let emailData = { seqno, header: null, body: null, imageUrls: [] };

      msg.on("body", async (stream, info) => {
        let buffer = "";
        stream.on("data", (chunk) => {
          buffer += chunk.toString("utf8");
        });
        stream.once("end", () => {
          if (info.which === "1") {
            let decodedBody = Buffer.from(buffer, "base64").toString("utf8");
            if (!isPrintable(decodedBody)) {
              decodedBody = quotedPrintable.decode(buffer);
            }
            let plainText = htmlToText.convert(decodedBody, {
              wordwrap: 130,
              ignoreImage: true,
              ignoreHref: true,
            });
            emailData.body = plainText;
            emailData.imageUrls = extractImageUrls(decodedBody);
            console.log(`\nSeqNo: ${seqno}`);
            console.log("Parsed text body: ", plainText);
            if (emailData.imageUrls.length > 0) {
              console.log("Image URLs:", emailData.imageUrls.join(", "));
            }
          } else {
            emailData.header = inspect(Imap.parseHeader(buffer));
            console.log("Parsed header:", emailData.header);
          }
        });
      });
    });

    return new Promise((resolve, reject) => {
      f.once("end", resolve);
      f.once("error", reject);
    });
  } catch (err) {
    console.error("Error while fetching emails:", err);
  } finally {
    imap.end();
  }
}

function imapConnect() {
  return new Promise((resolve, reject) => {
    imap.once("ready", resolve);
    imap.once("error", reject);
    imap.connect();
  });
}
fetchEmails().then(() => {
  console.log("Done fetching all messages!");
});

// //UPDATED CODE WITH OPEN URL AND ATTACHMENT IN EMAIL ID
// const Imap = require("node-imap");
// const inspect = require("util").inspect;
// const { Buffer } = require("buffer");
// const htmlToText = require("html-to-text");
// const quotedPrintable = require("quoted-printable");
// //const open = require("open") // Importing open package
// require("dotenv").config();

// let imap = new Imap({
//   user: process.env.EMAIL,
//   password: process.env.PASSWORD,
//   host: "imap.gmail.com",
//   port: 993,
//   tls: true,
// });

// function openInbox() {
//   return new Promise((resolve, reject) => {
//     imap.openBox("INBOX", true, (err, box) => {
//       if (err) reject(err);
//       else resolve(box);
//     });
//   });
// }

// function isPrintable(str) {
//   return /^[\x20-\x7E\s]*$/.test(str);
// }

// function extractImageUrls(html) {
//   const imgRegex = /<img[^>]+src="([^">]+)"/g;
//   let images = [];
//   let match;
//   while ((match = imgRegex.exec(html)) !== null) {
//     images.push(match[1]);
//   }
//   return images;
// }

// async function fetchEmails() {
//   try {
//     await imapConnect();
//     const box = await openInbox();
//     const f = imap.seq.fetch(
//       `${box.messages.total - 1}:${box.messages.total}`,
//       {
//         bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "1"],
//         struct: true,
//       }
//     );

//     f.on("message", (msg, seqno) => {
//       let emailData = {
//         seqno,
//         header: null,
//         body: null,
//         imageUrls: [],
//         attachments: [],
//       };

//       msg.on("body", async (stream, info) => {
//         let buffer = "";
//         stream.on("data", (chunk) => {
//           buffer += chunk.toString("utf8");
//         });

//         stream.once("end", () => {
//           if (info.which === "1") {
//             let decodedBody = Buffer.from(buffer, "base64").toString("utf8");
//             if (!isPrintable(decodedBody)) {
//               decodedBody = quotedPrintable.decode(buffer);
//             }

//             let plainText = htmlToText.convert(decodedBody, {
//               wordwrap: 130,
//               ignoreImage: true,
//               ignoreHref: true,
//             });

//             emailData.body = plainText;
//             emailData.imageUrls = extractImageUrls(decodedBody);

//             // Log the necessary data
//             console.log(`\nSeqNo: ${seqno}`);
//             console.log("Parsed text body: ", plainText);
//             if (emailData.imageUrls.length > 0) {
//               console.log("Image URLs:", emailData.imageUrls.join(", "));
//             }

//             // Open URLs in the default browser
//             const urls = extractUrls(decodedBody);
//             for (const url of urls) {
//               open(url).catch((err) =>
//                 console.error(`Failed to open URL: ${url}`, err)
//               );
//             }
//           } else {
//             emailData.header = inspect(Imap.parseHeader(buffer));
//             console.log("Parsed header:", emailData.header);
//           }
//         });
//       });

//       // Handling attachments
//       msg.once("attributes", (attrs) => {
//         const attachments = attrs.struct.filter(
//           (part) => part.disposition && part.disposition[0] === "ATTACHMENT"
//         );
//         attachments.forEach((part) => {
//           emailData.attachments.push(part);
//         });
//         if (emailData.attachments.length > 0) {
//           console.log(`Attachments found: ${emailData.attachments.length}`);
//           // Here, you can handle saving or processing the attachments
//         }
//       });
//     });

//     return new Promise((resolve, reject) => {
//       f.once("end", resolve);
//       f.once("error", reject);
//     });
//   } catch (err) {
//     console.error("Error while fetching emails:", err);
//   } finally {
//     imap.end();
//   }
// }

// function extractUrls(html) {
//   const urlRegex = /https?:\/\/[^\s]+/g;
//   return html.match(urlRegex) || [];
// }

// function imapConnect() {
//   return new Promise((resolve, reject) => {
//     imap.once("ready", resolve);
//     imap.once("error", reject);
//     imap.connect();
//   });
// }

// // Start the fetching process
// fetchEmails().then(() => {
//   console.log("Done fetching all messages!");
// });
