import { JSDOM } from 'jsdom';

export interface Calendar {
    [date: string]: CalendarEvent[];
}

interface CalendarEvent {
    date: string;
    dayOfweek: string;
    name: string;
    details: string;
    link: string;
    antal: number;
    mangler: number;
}

export const diffCalendars = (oldCalendar: Calendar, newCalendar: Calendar): Calendar => {
    if (!oldCalendar) {
        return newCalendar;
    }

    const diffedCalendar = Object.assign({}, newCalendar);
    for (let date in newCalendar) {
        const oldCalendarEventsForDate = oldCalendar[date];

        if (!oldCalendarEventsForDate || oldCalendarEventsForDate.length === 0) {
            continue;
        }

        diffedCalendar[date] = newCalendar[date].filter(newCalendarEvent => !oldCalendarEventsForDate.find(oldCalendarEvent => oldCalendarEvent.details === newCalendarEvent.details));

        if (diffedCalendar[date].length === 0) {
            delete diffedCalendar[date];
        }
    }

    return diffedCalendar;
}


export const parseEventTooltip = (tooltip: string): { antal: number, mangler: number } => {
    // Example Tooltip Text Antal : 4 Mangler : 1
    const [ _, antal, mangler ] = /Antal : (\d+) Mangler : (\d+)/.exec(tooltip);

    return {
        antal: Number(antal),
        mangler: Number(mangler),
    };
}

export const parseCalendar = (html: string, baseUrl?: string): Calendar => {
    const dom = new JSDOM(html, { url: baseUrl });
    const days = dom.window.document.getElementsByClassName('CalendarHeader');

    const calendar: Calendar = {};

    for (let daysIndex = 0; daysIndex < days.length; daysIndex++) {
        let day = days[daysIndex];
        const dayOfWeekElement = day.children[0];
        // </br>
        const dateElement = day.children[2];
        // </br>
        const eventTable = day.children[4];

        if (!dayOfWeekElement || !dateElement || !eventTable) {
            continue;
        }

        const dayOfWeek = dayOfWeekElement.textContent;
        const date = dateElement.textContent;

        if (!calendar[date]) {
            calendar[date] = [];
        }

        // Optimistic...
        try {
            // table
            const eventSpans = (eventTable as HTMLTableElement)
                // tbody
                .tBodies[0]
                    // tr
                    // tr
                    .rows[1]
                        // td
                        .firstElementChild
                            // div
                            .firstElementChild
                                // spans representing each event
                                .children;

            for (let eventIndex = 0; eventIndex < eventSpans.length; eventIndex++) {
                const eventSpan = eventSpans[eventIndex];

                const eventElement: HTMLAnchorElement = eventSpan.firstElementChild as HTMLAnchorElement;
                // Available events are wrapped in an anchor tag
                if (eventElement.tagName !== 'A') {
                    continue;
                }

                const eventNameElement = eventElement.children[0];
                // </br>
                const eventDetailsElement = eventElement.children[2];

                calendar[date].push({
                    date: date,
                    dayOfweek: dayOfWeek,
                    name: eventNameElement.textContent,
                    details: eventDetailsElement.textContent.replace(/\s+/, ' ').trim(),
                    link: eventElement.href,
                    ...parseEventTooltip(eventElement.title)
                });
            }
        } catch {
            // continue
        }
    }

    for (let date in calendar) {
        if (calendar[date].length === 0) {
            delete calendar[date];
        }
    }

    return calendar;
}