import dotenv = require('dotenv');
dotenv.config();

export const getLoginUrl = (): string => {
    return process.env.LOGIN_URL;
}

export const getLoginUsername = (): string => {
    return process.env.USER_NAME;
}

export const getLoginPassword = () => {
    return process.env.PASSWORD;
}

export const getEmailAddresses = (): string[] => {
    return (process.env.EMAIL_ADDRESSES || '').split(',');
}

export const getSendgridApiKey = (): string => {
    return process.env.SENDGRID_API_KEY;
}

export const getNumberOfMonths = (): number => {
    const numberOfMonths = Number(process.env.NUMBER_OF_MONTHS);
    return isNaN(numberOfMonths) ? 0 : numberOfMonths;
}
