import dotenv = require('dotenv');
dotenv.config();

export const getLoginUrl = (): string => {
    return process.env.LOGIN_URL;
}

export const getRootUrl = (): string => {
    return process.env.ROOT_URL;
}

export const getCalendarUrl = (): string => {
    return process.env.CALENDAR_URL;
}

export const getLoginUsername = (): string => {
    return process.env.USER_NAME;
}

export const getLoginPassword = () => {
    return process.env.PASSWORD;
}

export const getToEmailAddresses = (): string[] => {
    return (process.env.TO_EMAIL_ADDRESSES || '').split(',');
}

export const getFromEmailAddress = (): string => {
    return process.env.FROM_EMAIL_ADDRESS;
}

export const getEmailSubject = (): string => {
    return process.env.EMAIL_SUBJECT;
}

export const getUseHtml = (): boolean => {
    return process.env.USE_HTML === "true";
}

export const getSendgridApiKey = (): string => {
    return process.env.AzureWebJobsSendGridApiKey;
}

export const getNumberOfMonths = (): number => {
    const numberOfMonths = Number(process.env.NUMBER_OF_MONTHS);
    return isNaN(numberOfMonths) ? 0 : numberOfMonths;
}
