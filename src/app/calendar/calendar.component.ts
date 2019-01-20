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

  events$: Observable<Array<CalendarEvent<{book: Bookinfo}>>>;
  test_events$: any;

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

    this.test_events$ = this.http
      .post('http://63.34.166.57:5000/api/1.0/get/booking', { start_date: format(getStart(this.viewDate), 'YYYY-MM-DD'), end_date: format(getEnd(this.viewDate), 'YYYY-MM-DD') }, httpOptions)
      .pipe(
        mergeMap((bookings: any) => {
          console.log(bookings);
          let arr = bookings.bookings.map(booking => {
            console.log(booking);
            return this.http.get(`http://63.34.166.57:8080/book/id/${booking.book_id}`).pipe(
              tap(response => console.log(response)),
              map((book: any) => book.author),
              tap(response => console.log(response))
            );
          });
          console.log(arr);
          return forkJoin(arr);
        }),
        map(book => console.log(book))
      );

    // this.test_events$ = this.http
    //   .post('http://localhost:5000/api/1.0/get/booking', { start_date: format(getStart(this.viewDate), 'YYYY-MM-DD'), end_date: format(getEnd(this.viewDate), 'YYYY-MM-DD') }, httpOptions)
    //   .pipe(
    //     mergeMap((bookings: any) => {
    //       console.log("Booking:" )
    //       return this.http.get(`http://localhost:8080/book/id/${booking.book_id}`);
    //                             // .pipe(map((x: Bookinfo) => console.log(x.title)));
    //     })
    //   );

    // this.events$ = this.http
    //   .post('http://localhost:5000/api/1.0/get/booking', { start_date: format(getStart(this.viewDate), 'YYYY-MM-DD'), end_date: format(getEnd(this.viewDate), 'YYYY-MM-DD') }, httpOptions)
    //   .pipe(

    //     map(({ bookings }: { bookings: Booking[] }) => {
    //       return bookings.map((booking: Booking) => {
    //         return {
    //           title: `${booking.book_id} (Booked: ${booking.start_date} - ${booking.end_date})`,
    //           start: new Date(
    //             booking.start_date
    //           ),
    //           end: new Date(
    //             booking.end_date
    //           ),
    //           color: colors.yellow,
    //           allDay: true,
    //           meta: {
    //             booking
    //           }
    //         };
    //       });
    //     })
    //     // ******** end map
    //   );

  }

  // eventClicked(event: CalendarEvent<{ book: Book }>): void {
  //   window.open(
  //     `https://`
  //   )
  // }
}
