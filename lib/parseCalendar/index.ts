import { JSDOM } from 'jsdom';

export interface Calendar {
    [date: string]: CalendarEvent[];
}

interface CalendarEvent {
    date: string;
    dayOfWeek: string;
    name: string;
    details: string;
    link: string;
    antal: number;
    mangler: number;
    html: string;
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
    const result = /Antal : (\d+) Mangler : (\d+)/.exec(tooltip);
    return result && result.length === 3
        ? {
            antal: Number(result[1]),
            mangler: Number(result[2]),
        }
        : null;
}

export const parseCalendar = (html: string, baseUrl?: string): Calendar => {
    const dom = new JSDOM(html);
    const days = dom.window.document.getElementsByClassName('CalendarHeader');

    const calendar: Calendar = {};

    for (let daysIndex = 0; daysIndex < days.length; daysIndex++) {
        let dayOfWeekElement: Element;
        let dateElement: Element;
        let eventTable: Element;

        let day = days[daysIndex];
        if (day.children && day.children.length === 5) {
            dayOfWeekElement = day.children[0];
            // </br>
            dateElement = day.children[2];
            // </br>
            eventTable = day.children[4];
        } else if (day.children && day.children.length === 3) {
            dateElement = day.children[0];
            // </br>
            eventTable = day.children[2];
        } else {
            continue;
        }

        if (!dateElement || !eventTable) {
            continue;
        }

        const dayOfWeek = dayOfWeekElement && dayOfWeekElement.textContent;
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
                const parsedTooltip = (parseEventTooltip(eventElement.title));

                // Available events are wrapped in an anchor tag
                // and have a title attribute set
                if (eventElement.tagName !== 'A' || !parsedTooltip) {
                    continue;
                }

                // Make the relative href absolute
                eventElement.href = baseUrl + eventElement.href;

                // Convert the tooltip text to elements
                const { antal, mangler } = parsedTooltip;
                // Add a break so the tooltip elements appear on their own lines
                const brElement = dom.window.document.createElement('br');
                eventElement.appendChild(brElement);
                // For both antal and mangler, create a span followed by a br
                const antalElement = dom.window.document.createElement('span');
                antalElement.textContent = `Antal: ${parsedTooltip.antal}`;
                const antalBrElement = dom.window.document.createElement('br');
                eventElement.appendChild(antalElement);
                eventElement.appendChild(antalBrElement);
                const manglerElement = dom.window.document.createElement('span');
                manglerElement.textContent = `Mangler: ${parsedTooltip.mangler}`;
                const manglerBrElement = dom.window.document.createElement('br');
                eventElement.appendChild(manglerElement);
                eventElement.appendChild(manglerBrElement);

                // Extract name and details
                const eventName = eventElement.children[0].textContent;
                // [1] = </br>
                const eventDetails = eventElement.children[2].innerHTML.replace('<br><span>', ': ').replace('</span>', '').trim();

                calendar[date].push({
                    date: date,
                    dayOfWeek: dayOfWeek,
                    name: eventName,
                    details: eventDetails,
                    link: eventElement.href,
                    antal,
                    mangler,
                    html: eventSpan.innerHTML,
                });
            }
        } catch (e) {
            console.error(e);
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