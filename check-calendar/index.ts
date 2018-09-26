import { Context, HttpRequest } from 'azure-functions-ts-essentials';
import * as _request from 'request-promise-native';

import { parseCalendar, diffCalendars, Calendar } from '../lib/parseCalendar';
import { getLoginUsername, getLoginPassword, getLoginUrl, getNumberOfMonths, getToEmailAddresses, getFromEmailAddress, getEmailSubject, getRootUrl, getCalendarUrl, getUseHtml } from '../lib/env';

const DEFAULT_NUMBER_OF_MONTHS = 3;
var j = _request.jar()
const request = _request.defaults({jar: j});

export async function run(context: Context, req: HttpRequest): Promise<void> {
    const logger: Logger = context.log;

    await login(logger);

    const numberOfMonths = getNumberOfMonths() || DEFAULT_NUMBER_OF_MONTHS;
    let monthYear = dateToMonthYear(new Date());
    const newCalendar: Calendar = {};
    const rootUrl = getRootUrl();
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

    if (Object.keys(newEvents).length > 0) {
        logger('New Events! Sending email');
        const email = getEmailForEvents(newEvents);
        logger('Email created');
        context.bindings.message = email;
    } else {
        logger('No new events.');
    }

    return Promise.resolve();
};

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

interface EmailContent { type: 'text/plain' | 'text/html', value: string, }
interface EmailPersonalization { to: { email: string }[]
}
interface Email {
    personalizations: EmailPersonalization[],
    from: { email: string },
    subject: string,
    content: EmailContent[],
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
    const loginOptions = {
        form: {
            username: getLoginUsername(),
            password: getLoginPassword(),
        },
    };

    try {
        logger('Logging in');
        return await request.post(loginUrl, loginOptions);
    } catch {
        // Ignore the error. It always returns StatusCodeError 302
        logger('Logging in completed');
    }
}

const getCalendarHtmlForMonth = async ({month, year}: MonthYear, logger?: Logger): Promise<string> => {
    const currentMonthCalendarYear = `${getCalendarUrl()}&Day=01&Month=${month}&Year=${year}&View=Month`;

    try {
        // Get the new html and calendar first
        // If this throws, don't update the existing values
        logger(`Requesting calendar html for ${month}-${year}`);
        return await request.get(currentMonthCalendarYear);
    } catch (e) {
        logger.error(e);
    }
}

const getEmailForEvents = (events: Calendar): Email => {
    const toEmails = getToEmailAddresses().map(email => {
        return {
            email: email
        };
    });

    return {
        personalizations: [{
            to: toEmails
        }],
        from: { email: getFromEmailAddress() },
        subject: getEmailSubject(),
        content: [eventsToString(events, getUseHtml())],
   }
}

const eventsToString = (events: Calendar, html: boolean): EmailContent => {
    let content: string = '';
    for (let date in events) {
        const eventsForDate = events[date];
        if (eventsForDate.length > 0) {
            if (html) {
                const dateElement = `<p><b>${date}</b></p>`;
                const eventElements = events[date].map(event => event.html).join('<br>')

                content += `<p>${dateElement}${eventElements}</p></hr>`
            } else {
                events[date].forEach(({ antal, date, dayOfWeek, details, link, mangler, name }) => {
                    const dayOfWeekString = dayOfWeek ? ` (${dayOfWeek})` : '';
                    const eventString = [
                        `${date}${dayOfWeekString}: ${name}`,
                        `${details}`,
                        `Antal: ${antal} / Mangler: ${mangler}`,
                        `Link: ${link}`,
                        `----------------`
                    ].join('\n\n');

                    content += eventString;
                });
            }
        }
    }

    return {
        type: html ? 'text/html' : 'text/plain',
        value: content,
    };
}
