// backend/src/config/mpesa.js
const axios = require('axios');
const crypto = require('crypto');

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.businessShortCode = process.env.MPESA_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.callbackURL = process.env.MPESA_CALLBACK_URL;
    this.environment = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
    this.baseURL = this.environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
  }

  async getAccessToken() {
    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error('M-Pesa credentials missing. Check your .env file.');
    }
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    
    const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    });
    
    return response.data.access_token;
  }

  generateTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  // generatePassword(timestamp) {
  //   const data = `${this.businessShortCode}${this.passkey}${timestamp}`;
  //   return crypto.createHash('sha256').update(data).digest('hex');
  // }
  generatePassword(timestamp) {
    // Correct format for M-Pesa: Base64(Shortcode + Passkey + Timestamp)
    const data = `${this.businessShortCode}${this.passkey}${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  formatPhoneNumber(phone) {
    // Converts 07... or +254... to 254...
    if (phone.startsWith('0')) return `254${phone.substring(1)}`;
    if (phone.startsWith('+')) return phone.substring(1);
    return phone;
  }

  async stkPush(phoneNumber, amount, accountReference, transactionDesc) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const requestData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackURL,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('M-Pesa STK Push Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async verifyTransaction(transactionId) {
    // Implement transaction verification logic
  }
}

module.exports = new MpesaService();
