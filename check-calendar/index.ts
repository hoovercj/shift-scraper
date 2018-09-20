import { Context, HttpRequest } from 'azure-functions-ts-essentials';

import * as _request from 'request-promise-native';
import { parseCalendar, diffCalendars } from '../lib/parseCalendar';
import { getLoginUsername, getLoginPassword, getLoginUrl } from '../lib/env';

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

async function login(logger?: Logger): Promise<void> {
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
        await request.post(loginUrl, loginOptions);
    } catch (e) {
        logger.error(e);
    }
}

async function getCalendarHtmlForMonth(month: number, year: number, logger?: Logger): Promise<string> {
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
        return await request.get(currentMonthCalendarYear, calendarOptions);
    } catch (e) {
        logger.error(e);
    }
}

export async function run(context: Context, req: HttpRequest) {
    const logger: Logger = context.log;

    // Get Blob Input Bindings
    const currentMonthHtmlFromBlob = context.bindings.currentMonthHtml;
    const nextMonthHtmlFromBlob = context.bindings.nextMonthHtml;
    const currentCalendarFromBlob = context.bindings.currentCalendar;

    // Figure out dates
    const today = new Date();
    const currentMonth = Math.min(today.getUTCMonth() + 1, 12); // Math.min just to be safe
    const currentYear = today.getUTCFullYear();
    const isCurrentMonthDecember = currentMonth === 12;
    const nextMonth = isCurrentMonthDecember ? 1 : currentMonth + 1;
    const nextYear = isCurrentMonthDecember ? currentYear + 1 : currentYear;

    // Make requests
    await login(logger);
    const currentMonthHtmlFromUrl = await getCalendarHtmlForMonth(currentMonth, currentYear, logger);
    // TODO: Get from config
    const rootUrl = "https://system1.staffbook.dk/";
    const currentMonthCalendarFromUrl = parseCalendar(currentMonthHtmlFromUrl, rootUrl);
    const nextMonthHtmlFromUrl = await getCalendarHtmlForMonth(nextMonth, nextYear, logger);
    const nextMonthCalendarFromUrl = parseCalendar(nextMonthHtmlFromUrl, rootUrl);

    // This works because the months should have mutually exclusive dates
    // so they shouldn't overwrite each other
    const currentCalendarFromUrl = Object.assign({}, currentMonthCalendarFromUrl, nextMonthCalendarFromUrl);

    // Get the new events by diffing the combined calendars
    const newEvents = diffCalendars(currentCalendarFromBlob, currentCalendarFromUrl);

    // Write everything to output blobs
    context.bindings.oldCurrentMonthHtml = currentMonthHtmlFromBlob;
    context.bindings.oldNextMonthHtml = nextMonthHtmlFromBlob;
    context.bindings.oldCalendar = currentCalendarFromBlob;
    context.bindings.newCurrentMonthHtml = currentMonthHtmlFromUrl;
    context.bindings.newNextMonthHtml = nextMonthHtmlFromUrl;
    context.bindings.newCurrentCalendar = currentCalendarFromUrl;
    context.bindings.newEvents = newEvents;

    // TODO: Send email with new events

    // TODO: Run on a timer instead of an http trigger
    context.res = {
        status: 200,
        body: "OK",
    };

    context.done();
};
