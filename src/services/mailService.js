import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
  port: 587,           // TLS
  secure: false,       // false for TLS
  auth: {
    user: process.env.EMAIL_USER,  // your Gmail address
    pass: process.env.EMAIL_PASS,  // App password
  },
  });

  // Send mail
  const sendEmail = async (mail) => {

  const info = await transporter.sendMail({
    from: mail?.from || mail?.fromAddress || process.env.EMAIL_USER,
    to: mail.to || mail.toAddress,
    subject: mail.subject,
    text: mail.text,
    html: mail?.html
  });

  console.log("Message sent: %s", info.messageId);

  // Preview URL
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

export { sendEmail }