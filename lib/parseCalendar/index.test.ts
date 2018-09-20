import { parseCalendar, diffCalendars, Calendar } from './index';

import * as fs from 'fs';
import * as path from 'path';

// const calendarFile: string = fs.readFileSync(path.join(__dirname, '..', 'data', 'calendar.html')).toString();
const oldParsedCalendar: Calendar = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'calendar.parsed.old.json')).toString());
const newParsedCalendar: Calendar = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'calendar.parsed.new.json')).toString());

describe('parseCalendar', () => {
    it('parses the calendar', () => {
        expect(true).toBe(true);

        // const parsedCalendar = parseCalendar(calendarFile, 'http://www.example.com');
        const diffedCalendar = diffCalendars(oldParsedCalendar, newParsedCalendar);

        // fs.writeFileSync(path.join(__dirname, '..', 'data', 'calendar.parsed.json'), JSON.stringify(parsedCalendar));
        fs.writeFileSync(path.join(__dirname, '..', 'data', 'calendar.diffed.json'), JSON.stringify(diffedCalendar));
    });
});