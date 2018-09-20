import { Context, HttpRequest } from 'azure-functions-ts-essentials';

import * as _request from 'request-promise-native';
import { parseCalendar, diffCalendars, Calendar } from '../lib/parseCalendar';
import { getLoginUsername, getLoginPassword, getLoginUrl, getNumberOfMonths } from '../lib/env';

const DEFAULT_NUMBER_OF_MONTHS = 3;
var j = _request.jar()
const request = _request.defaults({jar: j});

interface Logger {
    (...message: Array<any>): void;
    error(...message: Array<any>): void;
    warn(...message: Array<any>): void;
    info(...message: Array<any>): void;
    verbose(...message: Array<any>): void;
    metric(...message: Array<any>): void;
}

interface MonthYear {
    month: number;
    year: number;
}

const dateToMonthYear = (date: Date): MonthYear => {
    return {
        month: Math.min(date.getUTCMonth() + 1, 12), // Math.min just to be safe
        year: date.getUTCFullYear(),
    }
}

const getNextMonthYear = ({ month, year }: MonthYear): MonthYear => {
    const isCurrentMonthDecember = month === 12;
    return {
        month: isCurrentMonthDecember ? 1 : month + 1,
        year: isCurrentMonthDecember ? year + 1 : year,
    }
}

const login = async (logger?: Logger): Promise<void> => {
    const loginUrl = getLoginUrl();
    // TODO: which of these are actually necessary?
    const loginOptions = {
        credentials: "include",
        headers: {},
        referrer: "https://system1.staffbook.dk/default.asp?show=login&sid=26",
        referrerPolicy: "no-referrer-when-downgrade",
        form: {
            username: getLoginUsername(),
            password: getLoginPassword(),
        },
        mode: "cors",
    };

    try {
        logger('Logging in');
        return await request.post(loginUrl, loginOptions);
    } catch {
        // Ignore the error. It always returns StatusCodeError 302
        logger('Logging in completed');
    }
}

async function getCalendarHtmlForMonth({month, year}: MonthYear, logger?: Logger): Promise<string> {
    // TODO: Get from config
    const currentMonthCalendarYear = `https://system1.staffbook.dk/default.asp?pageid=276&sid=26&Day=01&Month=${month}&Year=${year}&View=Month`;
    // TODO: are these necessary?
    const calendarOptions = {
        "referrer":"https://system1.staffbook.dk/default.asp?show=login&sid=26",
        "referrerPolicy":"no-referrer-when-downgrade",
    };

    try {
        // Get the new html and calendar first
        // If this throws, don't update the existing values
        logger(`Requesting calendar html for ${month}-${year}`);
        return await request.get(currentMonthCalendarYear, calendarOptions);
    } catch (e) {
        logger.error(e);
    }
}

export async function run(context: Context, req: HttpRequest) {
    const logger: Logger = context.log;

    await login(logger);

    const numberOfMonths = getNumberOfMonths() || DEFAULT_NUMBER_OF_MONTHS;
    let monthYear = dateToMonthYear(new Date());
    const newCalendar: Calendar = {};
    // TODO: Get from config
    const rootUrl = "https://system1.staffbook.dk/";
    for (let i = 0; i < numberOfMonths; i++) {
        const monthHtml = await getCalendarHtmlForMonth(monthYear, logger);
        logger('Parsing calendar...');
        const monthCalendar = parseCalendar(monthHtml, rootUrl)
        logger('Parsed calendar');
        // This works because the months should have mutually exclusive dates
        // so they shouldn't overwrite each other
        Object.assign(newCalendar, monthCalendar);

        monthYear = getNextMonthYear(monthYear);
    }

    const currentCalendarFromBlob = context.bindings.currentCalendar;

    logger('Diffing calendars...');
    const newEvents = diffCalendars(currentCalendarFromBlob, newCalendar);
    logger('Diffed calendars');

    // Write everything to output blobs
    logger('Writing output...');
    context.bindings.oldCalendar = currentCalendarFromBlob;
    context.bindings.newCurrentCalendar = newCalendar;
    context.bindings.newEvents = newEvents;
    logger('Output written');

    // TODO: Send email with new events
    // TODO: Run on a timer instead of an http trigger
    context.res = {
        status: 200,
        body: "OK",
    };

    context.done();
};
