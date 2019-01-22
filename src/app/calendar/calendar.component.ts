import { Component,ChangeDetectionStrategy, ViewChild, TemplateRef, OnInit } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import {
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfDay,
  endOfWeek,
  subDays,
  addDays,
  endOfMonth,
  isSameDay,
  isSameMonth,
  addHours,
  format
} from 'date-fns';
import { forkJoin, Subject, Observable } from 'rxjs';
import { mergeMap, map, pluck, tap } from 'rxjs/operators';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  CalendarEvent,
  CalendarEventAction,
  CalendarEventTimesChangedEvent,
  CalendarView
} from 'angular-calendar';
import { colors } from '../demo-utils/colors';

interface Booking {
  user_id: string;
  book_id: string;
  // title: string;
  // author: string;
  end_date: string;
  start_date: string;
}

interface Bookinfo {
  id: string;
  title: string;
  author: string;
}

@Component({
  selector: 'app-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  @ViewChild('modalContent')
  modalContent: TemplateRef<any>;

  view: CalendarView = CalendarView.Month;

  CalendarView = CalendarView;

  viewDate: Date = new Date();

  bookings$: Observable<Array<CalendarEvent<{book: Bookinfo}>>>;

  activeDayIsOpen: boolean = false;

  modalData: {
    action: string;
    event: CalendarEvent;
  };

  actions: CalendarEventAction[] = [
    {
      label: '<i class="fa fa-fw fa-pencil"></i>',
      onClick: ({event}: {event: CalendarEvent}): void => {
        this.handleEvent('Edited', event);
      }
    },
    {
      label: '<i class="fa fa-fw fa-times"></i>',
      onClick: ({event}: {event: CalendarEvent}): void => {
        this.events = this.events.filter(iEvent => iEvent !== event);
        this.handleEvent('Deleted', event);
      }
    }
  ];

  refresh: Subject<any> = new Subject();

  events: CalendarEvent[] = [
    {
      start: subDays(startOfDay(new Date()), 1),
      end: addDays(new Date(),1),
      title: 'A 3 day event',
      color: colors.red,
      actions: this.actions,
      allDay: true,
      resizable: {
        beforeStart: true,
        afterEnd: true
      },
      draggable: true
    },
  {
      start: startOfDay(new Date()),
      title: 'An event with no end date',
      color: colors.yellow,
      actions: this.actions
    },
    {
      start: subDays(endOfMonth(new Date()), 3),
      end: addDays(endOfMonth(new Date()), 3),
      title: 'A long event that spans 2 months',
      color: colors.blue,
      allDay: true
    },
    {
      start: addHours(startOfDay(new Date()), 2),
      end: new Date(),
      title: 'A draggable and resizable event',
      color: colors.yellow,
      actions: this.actions,
      resizable: {
        beforeStart: true,
        afterEnd: true
      },
      draggable: true
    }
  ];

  constructor(private modal: NgbModal, private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchEvents();
  }

  dayClicked({date, events}: {date: Date; events: Array<CalendarEvent<{ booking: Booking }>>;}): void {
    if (isSameMonth(date, this.viewDate)) {
      this.viewDate = date;
      if (
        (isSameDay(this.viewDate, date) && this.activeDayIsOpen === true) ||
        events.length === 0
      ) {
        this.activeDayIsOpen = false;
      } else {
        this.activeDayIsOpen = true;
        this.viewDate = date;
      }
    }
  }

  eventTimesChanged({
    event,
    newStart,
    newEnd
  }: CalendarEventTimesChangedEvent): void {
    event.start = newStart;
    event.end = newEnd;
    this.handleEvent('Dropped or resized', event);
    this.refresh.next();
  }

  handleEvent(action: string, event: CalendarEvent): void {
    this.modalData = { event, action };
    this.modal.open(this.modalContent, {size: 'lg'});
  }

  addEvent(): void {
    this.events.push({
      title: 'New event',
      start: startOfDay(new Date()),
      end: endOfDay(new Date()),
      color: colors.red,
      draggable: true,
      resizable: {
        beforeStart: true,
        afterEnd: true
      }
    });
    this.refresh.next()
  }

  fetchEvents(): void {
    const getStart: any = {
      month: startOfMonth,
      week: startOfWeek,
      day: startOfDay
    }[this.view];

    const getEnd: any = {
      month: endOfMonth,
      week: endOfWeek,
      day: endOfDay
    }[this.view];

    const params = new HttpParams()
      .set(
        'start_date.gte',
        format(getStart(this.viewDate), 'YYYY-MM-DD')
      )
      .set(
        'start_date.lte',
        format(getEnd(this.viewDate), 'YYYY-MM-DD')
      );

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    this.bookings$ = this.http
      .post('http://63.34.166.57:5000/api/1.0/get/booking', { start_date: format(getStart(this.viewDate), 'YYYY-MM-DD'), end_date: format(getEnd(this.viewDate), 'YYYY-MM-DD') }, httpOptions)
      .pipe(
        mergeMap(( bookings : { bookings: Booking[] }) => {
          let arr = bookings.bookings.map((booking, i) => {
            let color = i % 2 ? colors.yellow : colors.blue;
            return this.http.get(`http://63.34.166.57:8080/book/id/${booking.book_id}`).pipe(
              map((book: Bookinfo): CalendarEvent => {
                let booking_event = {
                  title: `${book.title} (Booked by: ${booking.user_id})`,
                  start: new Date(
                    booking.start_date
                  ),
                  end: new Date(
                    booking.end_date
                  ),
                  color: color,
                  allDay: true,
                  meta: {
                    booking
                  }
                };
                this.events.push(booking_event);
                return booking_event;
              }),
              tap(response => console.log(response))
            );
          });
          return forkJoin(arr);
        })
        // tap(results => console.log(results))
      );

  }

  // eventClicked(event: CalendarEvent<{ book: Book }>): void {
  //   window.open(
  //     `https://`
  //   )
  // }
}
