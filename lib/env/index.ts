import dotenv = require('dotenv');
dotenv.config();

export const getLoginUrl = (): string => {
    return process.env.LOGIN_URL;
}

export const getLoginUsername = () => {
    return process.env.USER_NAME;
}

export const getLoginPassword = () => {
    return process.env.PASSWORD;
}

export const getEmailAddresses = (): string[] => {
    return (process.env.EMAIL_ADDRESSES || '').split(',');
}

export const getSendgridApiKey = (): string => {
    return process.env.LOGIN_URL;
}

export const getNumberOfMonths = (): string => {
    return process.env.LOGIN_URL;
}
